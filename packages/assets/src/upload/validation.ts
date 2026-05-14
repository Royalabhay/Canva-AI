import { z } from "zod";

export const ACCEPTED_ASSET_TYPES = [
  "image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml",
  "video/mp4", "video/webm", "video/quicktime"
] as const;

export const assetUploadSchema = z.object({
  workspaceId: z.string().uuid(),
  filename: z.string().min(1).max(240),
  contentType: z.enum(ACCEPTED_ASSET_TYPES),
  sizeBytes: z.number().int().positive().max(524_288_000),
  folderId: z.string().uuid().optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).default([])
});

export function classifyAssetKind(contentType: string) {
  if (contentType.startsWith("image/")) return "image" as const;
  if (contentType.startsWith("video/")) return "video" as const;
  return "other" as const;
}

export function validateFileForUpload(file: File, maxBytes = 524_288_000) {
  if (!ACCEPTED_ASSET_TYPES.includes(file.type as never)) throw new Error(`Unsupported file type: ${file.type}`);
  if (file.size > maxBytes) throw new Error("File exceeds workspace upload limit");
}
