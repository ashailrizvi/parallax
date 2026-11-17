/**
 * The model registry: every model the studio can run, as data.
 * To add a model, add one entry in `image.ts`, `video.ts` or `audio.ts`. The composer,
 * the live price, validation and the provider call all follow from that entry.
 */
import { musicModels, speechModels } from "./audio";
import { imageModels } from "./image";
import { localH3Image, localH3Video } from "./local";
import { videoModels } from "./video";
import type { ModelDef } from "./types";
import { personalStudio } from "../config/studio-mode";

const localModels = [localH3Image, localH3Video];
export const models: ModelDef[] = [
  ...(personalStudio ? localModels : []), ...imageModels, ...videoModels, ...speechModels, ...musicModels,
];

const byId = new Map(models.map((m) => [m.id, m]));
for (const model of localModels) byId.set(model.id, model);

export function getModel(id: string | null | undefined): ModelDef | undefined {
  return id ? byId.get(id) : undefined;
}

/** Models for one studio or tool, in display order. */
export function modelsFor(surface: string): ModelDef[] {
  if (personalStudio && surface === "image") return [localH3Image];
  if (personalStudio && surface === "video") return [localH3Video];
  return models.filter((m) => m.surfaces.includes(surface));
}

/** The model a surface opens on: the first featured one that can run. */
export function defaultModel(surface: string): ModelDef | undefined {
  const list = modelsFor(surface).filter((m) => m.status === "available");
  return list.find((m) => m.featured) ?? list[0];
}

export * from "./types";
export * from "./logic";
export { quoteUsd, catalogEndpoint } from "./quote";
