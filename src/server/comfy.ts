import "server-only";

import { randomInt } from "node:crypto";
import { readFile } from "node:fs/promises";
import { COMFY_IMAGE_ENDPOINT } from "@/registry/local";
import { ResultError } from "./extract";
import type { JobRow } from "./jobs";

type WorkflowNode = { class_type: string; inputs: Record<string, unknown> };
type Workflow = Record<string, WorkflowNode>;
type OutputImage = { filename: string; subfolder: string; type: string };
type HistoryEntry = {
  status?: { status_str?: string; completed?: boolean };
  outputs?: Record<string, { images?: OutputImage[] }>;
};

export class ComfyUnreachable extends Error {}

function origin() {
  let url: URL;
  try {
    url = new URL(process.env.ACE_STUDIO_COMFY_URL ?? "http://127.0.0.1:8189");
  } catch {
    throw new ResultError("The ComfyUI address is invalid.");
  }
  if (url.protocol !== "http:" || url.hostname !== "127.0.0.1" || url.username || url.password ||
      url.search || url.hash || url.pathname !== "/") {
    throw new ResultError("Use a loopback ComfyUI address such as http://127.0.0.1:8189.");
  }
  return url.origin;
}

async function request(path: string, init?: RequestInit) {
  const url = origin() + path;
  try {
    return await fetch(url, { ...init, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15_000) });
  } catch {
    throw new ComfyUnreachable("ComfyUI is unreachable.");
  }
}

async function loadWorkflow(): Promise<Workflow> {
  try {
    const path = process.env.ACE_STUDIO_H3_WORKFLOW ?? "data/comfy/h3-image-api.json";
    const graph = JSON.parse(await readFile(path, "utf8")) as Workflow;
    if (!graph || typeof graph !== "object" || Array.isArray(graph)) throw new Error();
    return graph;
  } catch {
    throw new ResultError("Ace Studio could not read the ComfyUI H3 Image API workflow. Check the workflow path.");
  }
}

function inputsOf(graph: Workflow, classType: string) {
  const nodes = Object.values(graph).filter((node) => node?.class_type === classType);
  if (nodes.length !== 1 || !nodes[0].inputs || typeof nodes[0].inputs !== "object") {
    throw new ResultError(`The H3 Image workflow must contain one ${classType} node.`);
  }
  return nodes[0].inputs;
}

export async function submitComfyImage(job: JobRow, promptId: string) {
  const graph = await loadWorkflow();
  const { body } = JSON.parse(job.request) as {
    body: { prompt: string; aspectRatio: string; megapixels: number };
  };
  inputsOf(graph, "PrimitiveStringMultiline").value = body.prompt;
  const resolution = inputsOf(graph, "ResolutionSelector");
  resolution.aspect_ratio = body.aspectRatio;
  resolution.megapixels = body.megapixels;
  inputsOf(graph, "KSampler").seed = randomInt(2 ** 32);
  inputsOf(graph, "SaveImage").filename_prefix = `AceStudio/H3Image/${promptId}`;
  try {
    const ready = await request("/system_stats");
    if (!ready.ok) throw new ComfyUnreachable();
    await ready.body?.cancel();
  } catch (err) {
    if (!(err instanceof ComfyUnreachable)) throw err;
    throw new ResultError("ComfyUI is offline. Start the local backend and try again.");
  }
  const reply = await request("/prompt", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt: graph, prompt_id: promptId }),
  });
  if (!reply.ok) {
    const detail = await reply.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new ResultError(detail?.error?.message ?? "ComfyUI refused the H3 Image workflow.");
  }
  const queued = await reply.json() as { prompt_id?: string };
  if (queued.prompt_id !== promptId) throw new ResultError("ComfyUI did not confirm the requested prompt ID.");
}

export async function readComfyImage(promptId: string): Promise<Buffer | null> {
  const reply = await request(`/history/${encodeURIComponent(promptId)}`);
  if (!reply.ok) throw new ComfyUnreachable("ComfyUI history is temporarily unavailable.");
  const entries = await reply.json() as Record<string, HistoryEntry>;
  const history = entries[promptId];
  if (!history) return null;
  if (history.status?.status_str !== "success" || !history.status.completed) {
    throw new ResultError("The H3 Image workflow failed. Open ComfyUI to see the node error.");
  }
  const image = Object.values(history.outputs ?? {}).flatMap((node) => node.images ?? [])
    .find((file) => file.type === "output" && typeof file.filename === "string" && file.filename.endsWith(".png"));
  if (!image) throw new ResultError("ComfyUI completed the workflow without a saved PNG.");
  const query = new URLSearchParams({ filename: image.filename, subfolder: image.subfolder, type: image.type });
  const file = await request(`/view?${query}`);
  if (!file.ok) throw new ComfyUnreachable("ComfyUI output is temporarily unavailable.");
  if (Number(file.headers.get("content-length")) > 40_000_000) {
    await file.body?.cancel();
    throw new ResultError("ComfyUI returned an oversized image.");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!bytes.length || bytes.length > 40_000_000) throw new ResultError("ComfyUI returned an empty or oversized image.");
  return bytes;
}

export function isComfyImage(job: Pick<JobRow, "endpoint">) {
  return job.endpoint === COMFY_IMAGE_ENDPOINT;
}
