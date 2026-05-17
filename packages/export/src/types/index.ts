import { z } from "zod";

export const exportFormatSchema = z.enum(["png", "jpg", "svg", "pdf", "mp4"]);
export type ExportFormat = z.infer<typeof exportFormatSchema>;

export const exportStatusSchema = z.enum(["queued", "active", "rendering", "uploading", "completed", "failed", "cancelled"]);
export type ExportStatus = z.infer<typeof exportStatusSchema>;

export const designPageSchema = z.object({
  id: z.string().min(1).default("page-1"),
  name: z.string().min(1).default("Page 1"),
  fabricJson: z.record(z.string(), z.unknown()),
  width: z.number().int().positive().max(12000),
  height: z.number().int().positive().max(12000),
  background: z.string().optional()
});
export type DesignPage = z.infer<typeof designPageSchema>;

export const renderOptionsSchema = z.object({
  format: exportFormatSchema,
  width: z.number().int().positive().max(12000).optional(),
  height: z.number().int().positive().max(12000).optional(),
  scale: z.number().positive().min(0.1).max(8).default(1),
  quality: z.number().int().min(1).max(100).default(92),
  transparentBackground: z.boolean().default(false),
  filename: z.string().min(1).max(160).optional(),
  embedAssets: z.boolean().default(true),
  printDpi: z.number().int().min(72).max(600).default(300)
});
export type RenderOptions = z.infer<typeof renderOptionsSchema>;

export const exportRequestSchema = z.object({
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  designId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
  requestedBy: z.string().uuid(),
  pages: z.array(designPageSchema).min(1).max(100),
  options: renderOptionsSchema
});
export type ExportRequest = z.infer<typeof exportRequestSchema>;

export interface ExportJobData extends ExportRequest {
  exportId: string;
  jobId: string;
  priority?: number;
}

export interface RenderedArtifact {
  buffer: Buffer;
  format: Exclude<ExportFormat, "mp4">;
  width?: number;
  height?: number;
  mimeType: string;
  extension: string;
  bytes: number;
  pageCount: number;
  metadata: Record<string, unknown>;
}

export interface ExportResult {
  exportId: string;
  jobId: string;
  status: "completed";
  bucket: string;
  path: string;
  signedUrl: string;
  expiresAt: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  pageCount: number;
}

export interface ThumbnailRequest {
  workspaceId: string;
  subjectId: string;
  subjectType: "project" | "template" | "design" | "ai_preview";
  page: DesignPage;
  width?: number;
  height?: number;
}

export interface ThumbnailResult {
  bucket: string;
  path: string;
  signedUrl: string;
  width: number;
  height: number;
}

export interface RenderProgress {
  status: ExportStatus;
  progress: number;
  message: string;
}

export interface VideoCompositionPlan {
  format: "mp4";
  timeline: Array<{ pageId: string; startMs: number; durationMs: number; transitions?: string[] }>;
  width: number;
  height: number;
  fps: number;
  audioTracks: Array<{ src: string; startMs: number; volume: number }>;
}
