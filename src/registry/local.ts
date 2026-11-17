import type { ModelDef } from "./types";

export const COMFY_IMAGE_ENDPOINT = "comfyui.h3-image";
export const COMFY_VIDEO_ENDPOINT = "comfyui.h3-video";

export function isComfyEndpoint(endpoint: string): boolean {
  return endpoint === COMFY_IMAGE_ENDPOINT || endpoint === COMFY_VIDEO_ENDPOINT;
}

const aspectRatios = [
  "1:1 (Square)", "2:3 (Portrait Photo)", "3:2 (Photo)", "3:4 (Portrait Standard)",
  "4:3 (Standard)", "9:16 (Portrait Widescreen)", "16:9 (Widescreen)", "21:9 (Ultrawide)",
];

export const localH3Image: ModelDef = {
  id: "minimax-h3-image-local",
  kind: "image",
  name: "MiniMax H3 Image",
  vendor: "MiniMax",
  tagline: "Text to image on your local ComfyUI GPU",
  featured: true,
  status: "available",
  surfaces: ["image"],
  prompt: { required: true, maxLength: 4000 },
  slots: [],
  controls: [
    {
      type: "select", id: "aspect_ratio", label: "Aspect ratio", default: aspectRatios[0],
      options: aspectRatios.map((value) => ({ value, label: value.split(" ")[0] })),
    },
    {
      type: "select", id: "resolution", label: "Resolution", default: "1",
      options: ["1", "2", "4"].map((value) => ({ value, label: `${value} MP` })),
    },
  ],
  batch: { max: 1, native: false },
  output: "image",
  eta: 45,
  build: ({ prompt, values }) => ({
    endpoint: COMFY_IMAGE_ENDPOINT,
    body: { prompt, aspectRatio: values.aspect_ratio, megapixels: Number(values.resolution) },
  }),
};

export const localH3Video: ModelDef = {
  id: "minimax-h3-video-local",
  kind: "video",
  name: "MiniMax H3 Video",
  vendor: "MiniMax",
  tagline: "Local preview · 736 × 416 · 3 seconds · 24 fps",
  featured: true,
  status: "available",
  surfaces: ["video"],
  prompt: { required: true, maxLength: 4000 },
  slots: [{ id: "start", label: "Start frame", accept: ["image"], min: 0, max: 1 }],
  controls: [],
  batch: { max: 1, native: false },
  output: "video",
  eta: 120,
  build: ({ prompt }) => ({ endpoint: COMFY_VIDEO_ENDPOINT, body: { prompt } }),
};
