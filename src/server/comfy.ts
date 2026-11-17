import "server-only";

import { randomInt } from "node:crypto";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { COMFY_VIDEO_ENDPOINT } from "@/registry/local";
import { ownedAsset, readAsset } from "./assets";
import { parseJson } from "./db";
import { ResultError } from "./extract";
import type { JobRow } from "./jobs";

type WorkflowNode = { class_type: string; inputs: Record<string, unknown> };
type Workflow = Record<string, WorkflowNode>;
type OutputFile = { filename: string; subfolder: string; type: string };
type HistoryEntry = {
  status?: { status_str?: string; completed?: boolean };
  outputs?: Record<string, { images?: OutputFile[]; gifs?: OutputFile[] }>;
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

async function loadWorkflow(video: boolean): Promise<Workflow> {
  try {
    const path = video
      ? process.env.ACE_STUDIO_H3_VIDEO_WORKFLOW ?? "data/comfy/h3-video-api.json"
      : process.env.ACE_STUDIO_H3_WORKFLOW ?? "data/comfy/h3-image-api.json";
    const graph = JSON.parse(await readFile(path, "utf8")) as Workflow;
    if (!graph || typeof graph !== "object" || Array.isArray(graph)) throw new Error();
    return graph;
  } catch {
    throw new ResultError(`Ace Studio could not read the ComfyUI H3 ${video ? "Video" : "Image"} API workflow. Check the workflow path.`);
  }
}

function inputsOf(graph: Workflow, classType: string) {
  const nodes = Object.values(graph).filter((node) => node?.class_type === classType);
  if (nodes.length !== 1 || !nodes[0].inputs || typeof nodes[0].inputs !== "object") {
    throw new ResultError(`The ComfyUI workflow must contain one ${classType} node.`);
  }
  return nodes[0].inputs;
}

async function addStartFrame(graph: Workflow, job: JobRow, promptId: string) {
  const assetId = parseJson<Record<string, string[]>>(job.inputs, {}).start?.[0];
  if (!assetId) return;

  const asset = ownedAsset(job.user_id, assetId);
  const form = new FormData();
  const bytes = await readAsset(asset);
  form.append("image", new Blob([Uint8Array.from(bytes)], { type: asset.mime }), promptId + extname(asset.path));
  form.append("subfolder", "ace-studio");

  const upload = await request("/upload/image", { method: "POST", body: form }).catch((error) => {
    if (!(error instanceof ComfyUnreachable)) throw error;
    throw new ResultError("ComfyUI could not receive the start frame. Check the local backend and try again.");
  });
  if (!upload.ok) throw new ResultError("ComfyUI could not receive the start frame.");
  const stored = await upload.json() as { name?: string; subfolder?: string; type?: string };
  if (!stored.name || stored.type !== "input") throw new ResultError("ComfyUI did not return an input filename.");

  // The saved preview uses this fit for its image branch. Reuse its native first-frame input.
  const resolutionId = Object.keys(graph).find((id) => graph[id].class_type === "ResolutionSelector");
  if (!resolutionId || graph["ace-start"] || graph["ace-fit"]) throw new ResultError("The H3 Video API workflow cannot accept a start frame.");
  graph["ace-start"] = {
    class_type: "LoadImage",
    inputs: { image: [stored.subfolder, stored.name].filter(Boolean).join("/") },
  };
  graph["ace-fit"] = {
    class_type: "ImageResizeKJv2",
    inputs: {
      image: ["ace-start", 0], width: [resolutionId, 0], height: [resolutionId, 1],
      upscale_method: "lanczos", keep_proportion: "pad", pad_color: "34, 34, 34",
      crop_position: "center", divisible_by: 32, device: "cpu",
    },
  };
  inputsOf(graph, "MiniMaxH3ImageToVideo").first_frame = ["ace-fit", 0];
}

export async function submitComfyJob(job: JobRow, promptId: string) {
  const video = job.endpoint === COMFY_VIDEO_ENDPOINT;
  const graph = await loadWorkflow(video);
  inputsOf(graph, "PrimitiveStringMultiline").value = job.prompt;
  const seed = randomInt(2 ** 32);
  if (video) {
    inputsOf(graph, "RandomNoise").noise_seed = seed;
    inputsOf(graph, "VHS_VideoCombine").filename_prefix = `AceStudio/H3Video/${promptId}`;
  } else {
    const { body } = parseJson<{ body: { aspectRatio?: string; megapixels?: number } }>(job.request, { body: {} });
    const resolution = inputsOf(graph, "ResolutionSelector");
    resolution.aspect_ratio = body.aspectRatio ?? resolution.aspect_ratio;
    resolution.megapixels = body.megapixels ?? resolution.megapixels;
    inputsOf(graph, "KSampler").seed = seed;
    inputsOf(graph, "SaveImage").filename_prefix = `AceStudio/H3Image/${promptId}`;
  }
  try {
    const ready = await request("/system_stats");
    if (!ready.ok) throw new ComfyUnreachable();
    await ready.body?.cancel();
  } catch (err) {
    if (!(err instanceof ComfyUnreachable)) throw err;
    throw new ResultError("ComfyUI is offline. Start the local backend and try again.");
  }
  if (video) await addStartFrame(graph, job, promptId);
  const reply = await request("/prompt", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt: graph, prompt_id: promptId }),
  });
  if (!reply.ok) {
    const detail = await reply.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new ResultError(detail?.error?.message ?? "ComfyUI refused the H3 workflow.");
  }
  const queued = await reply.json() as { prompt_id?: string };
  if (queued.prompt_id !== promptId) throw new ResultError("ComfyUI did not confirm the requested prompt ID.");
}

export async function readComfyResult(job: JobRow, promptId: string): Promise<Buffer | null> {
  const video = job.endpoint === COMFY_VIDEO_ENDPOINT;
  const reply = await request(`/history/${encodeURIComponent(promptId)}`);
  if (!reply.ok) throw new ComfyUnreachable("ComfyUI history is temporarily unavailable.");
  const entries = await reply.json() as Record<string, HistoryEntry>;
  const history = entries[promptId];
  if (!history) return null;
  if (history.status?.status_str !== "success" || !history.status.completed) {
    throw new ResultError("The H3 workflow failed. Open ComfyUI to see the node error.");
  }
  const extension = video ? ".mp4" : ".png";
  const result = Object.values(history.outputs ?? {}).flatMap((node) => video ? node.gifs ?? [] : node.images ?? [])
    .find((file) => file.type === "output" && typeof file.filename === "string" && file.filename.endsWith(extension));
  if (!result) throw new ResultError(`ComfyUI completed the workflow without a saved ${video ? "MP4" : "PNG"}.`);
  const query = new URLSearchParams({ filename: result.filename, subfolder: result.subfolder, type: result.type });
  const file = await request(`/view?${query}`);
  if (!file.ok) throw new ComfyUnreachable("ComfyUI output is temporarily unavailable.");
  if (Number(file.headers.get("content-length")) > 40_000_000) {
    await file.body?.cancel();
    throw new ResultError("ComfyUI returned an oversized file.");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!bytes.length || bytes.length > 40_000_000) throw new ResultError("ComfyUI returned an empty or oversized file.");
  return bytes;
}
