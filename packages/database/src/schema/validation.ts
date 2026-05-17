import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const slugSchema = z.string().min(1).max(96).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const jsonRecordSchema = z.record(z.string(), z.unknown());

export const createProjectSchema = z.object({
  workspaceId: uuidSchema,
  name: z.string().min(1).max(160),
  description: z.string().max(2000).optional(),
  metadata: jsonRecordSchema.optional()
});

export const updateProjectSchema = z.object({
  projectId: uuidSchema,
  name: z.string().min(1).max(160).optional(),
  description: z.string().max(2000).nullable().optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  metadata: jsonRecordSchema.optional()
});

export const autosaveDesignSchema = z.object({
  designId: uuidSchema,
  fabricJson: z.unknown(),
  thumbnailUrl: z.string().url().nullable().optional(),
  metadata: jsonRecordSchema.optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional()
});

export const createSignedUploadSchema = z.object({
  workspaceId: uuidSchema,
  filename: z.string().min(1).max(240),
  contentType: z.string().min(1).max(120),
  kind: z.enum(["image", "video", "font", "audio", "document", "other"]).default("image"),
  sizeBytes: z.number().int().positive().optional()
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type AutosaveDesignInput = z.infer<typeof autosaveDesignSchema>;
export type CreateSignedUploadInput = z.infer<typeof createSignedUploadSchema>;
