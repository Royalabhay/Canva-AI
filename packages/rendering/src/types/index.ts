import { z } from "zod";

export const renderKindSchema = z.enum(["video", "image", "audio", "thumbnail", "transcode"]);
export type RenderKind = z.infer<typeof renderKindSchema>;
export const renderStatusSchema = z.enum(["queued", "active", "rendering", "uploading", "completed", "failed", "cancelled", "dead_letter"]);
export type RenderStatus = z.infer<typeof renderStatusSchema>;
export const videoFormatSchema = z.enum(["mp4", "webm"]);
export type VideoFormat = z.infer<typeof videoFormatSchema>;

export const keyframeSchema = z.object({ timeMs: z.number().int().nonnegative(), value: z.union([z.number(), z.string(), z.record(z.string(), z.unknown())]), easing: z.enum(["linear", "ease-in", "ease-out", "ease-in-out"]).default("linear") });
export const animationTrackSchema = z.object({ property: z.string(), keyframes: z.array(keyframeSchema).min(1) });
export const timelineLayerSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["image", "video", "text", "shape", "audio"]),
  src: z.string().optional(),
  text: z.string().optional(),
  shape: z.enum(["rect", "ellipse"]).optional(),
  x: z.number().default(0),
  y: z.number().default(0),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  fill: z.string().default("#000000"),
  opacity: z.number().min(0).max(1).default(1),
  startMs: z.number().int().nonnegative().default(0),
  durationMs: z.number().int().positive(),
  zIndex: z.number().int().default(0),
  animations: z.array(animationTrackSchema).default([]),
  volume: z.number().min(0).max(2).default(1)
});
export const transitionSchema = z.object({ type: z.enum(["cut", "fade", "crossfade", "wipeleft", "wiperight"]).default("cut"), durationMs: z.number().int().nonnegative().default(0) });
export const timelineSceneSchema = z.object({ id: z.string().min(1), name: z.string().default("Scene"), durationMs: z.number().int().positive(), background: z.string().default("#ffffff"), layers: z.array(timelineLayerSchema).default([]), transitionOut: transitionSchema.optional() });
export const videoTimelineSchema = z.object({ id: z.string().min(1), width: z.number().int().positive().max(7680), height: z.number().int().positive().max(4320), fps: z.number().int().min(1).max(120).default(30), scenes: z.array(timelineSceneSchema).min(1), audioTracks: z.array(timelineLayerSchema.extend({ type: z.literal("audio") })).default([]) });
export type VideoTimeline = z.infer<typeof videoTimelineSchema>;
export type TimelineScene = z.infer<typeof timelineSceneSchema>;
export type TimelineLayer = z.infer<typeof timelineLayerSchema>;

export const renderRequestSchema = z.object({
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  requestedBy: z.string().uuid(),
  kind: renderKindSchema,
  priority: z.number().int().min(1).max(10).default(5),
  timeline: videoTimelineSchema.optional(),
  source: z.object({ bucket: z.string(), path: z.string(), mimeType: z.string().optional() }).optional(),
  output: z.object({ format: videoFormatSchema.default("mp4"), filename: z.string().min(1).max(160).default("render"), quality: z.enum(["draft", "standard", "high", "lossless"]).default("standard"), transparent: z.boolean().default(false) }).default({ format: "mp4", filename: "render", quality: "standard", transparent: false })
});
export type RenderRequest = z.infer<typeof renderRequestSchema>;

export interface RenderJobData extends RenderRequest { renderJobId: string; queueJobId: string; workerPool?: string }
export interface RenderOutput { bucket: string; path: string; signedUrl: string; mimeType: string; sizeBytes: number; width?: number; height?: number; durationMs?: number; format: string }
export interface WorkerHeartbeat { workerId: string; pool: string; hostname: string; version: string; concurrency: number; gpuEnabled: boolean; status: "starting" | "idle" | "busy" | "draining" | "offline" }
