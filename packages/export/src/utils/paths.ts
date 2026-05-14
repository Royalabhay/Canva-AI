import { extensionForFormat } from "./mime";
import type { ExportFormat } from "../types";

function safePart(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "export";
}

export function exportStoragePath(workspaceId: string, exportId: string, filename: string | undefined, format: ExportFormat): string {
  const stem = safePart(filename ?? `design-${exportId}`);
  return `${workspaceId}/${exportId}/${stem}.${extensionForFormat(format)}`;
}

export function thumbnailStoragePath(workspaceId: string, subjectType: string, subjectId: string): string {
  return `${workspaceId}/${subjectType}/${subjectId}/thumbnail.webp`;
}
