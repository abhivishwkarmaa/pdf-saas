import { z } from "zod";

export const VideoOptionsSchema = z.object({
  task: z.enum(["convert", "compress", "edit", "merge", "slideshow", "ai"]).optional(),
  format: z.string().optional(),
  compressMode: z.enum(["smart", "manual", "lossless", "target-size", "bitrate"]).optional(),
  compressLevel: z.enum(["low", "medium", "high"]).optional(),
  targetSizeMb: z.union([z.string(), z.number()])
    .transform(val => {
      if (val === undefined || val === "") return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    })
    .refine(val => val === undefined || val > 0, {
      message: "targetSizeMb must be a positive number",
    })
    .optional(),
  bitrate: z.string().optional(),
  fps: z.string().optional(),
  resolution: z.enum(["360p", "480p", "720p", "1080p", "2K", "4K", ""]).optional(),
  codec: z.enum(["h264", "hevc", "vp9", "copy", ""]).optional(),
  trimStart: z.string().optional(),
  trimDuration: z.string().optional(),
  cropX: z.string().optional(),
  cropY: z.string().optional(),
  cropW: z.string().optional(),
  cropH: z.string().optional(),
  rotate: z.enum(["90", "180", "270", ""]).optional(),
  speed: z.string().optional(),
  reverse: z.boolean().optional(),
  mute: z.boolean().optional(),
  removeAudio: z.boolean().optional(),
  aspectRatio: z.enum(["16:9", "4:3", "1:1", "9:16", ""]).optional(),
  watermarkText: z.string().optional(),
  watermarkOpacity: z.string().optional(),
  watermarkPosition: z.enum(["top-left", "top-right", "bottom-left", "bottom-right"]).optional(),
  aiDenoise: z.boolean().optional(),
  aiEnhance: z.boolean().optional(),
  aiUpscale: z.boolean().optional(),
  aiCaptions: z.boolean().optional(),
  aiSceneDetect: z.boolean().optional(),
  audioKey: z.string().optional(),
  audioMergeMode: z.enum(["replace", "mix"]).optional(),
  splitPoints: z.string().optional(),
  imageDuration: z.string().optional(),
}).refine(data => {
  const hasW = !!data.cropW;
  const hasH = !!data.cropH;
  return (hasW && hasH) || (!hasW && !hasH);
}, {
  message: "cropW and cropH must be provided together",
  path: ["cropW"],
});

export type VideoOptions = z.infer<typeof VideoOptionsSchema>;
