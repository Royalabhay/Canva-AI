import type { ExportFormat } from "../types";

export function mimeForFormat(format: ExportFormat): string {
  switch (format) {
    case "png": return "image/png";
    case "jpg": return "image/jpeg";
    case "svg": return "image/svg+xml";
    case "pdf": return "application/pdf";
    case "mp4": return "video/mp4";
  }
}

export function extensionForFormat(format: ExportFormat): string {
  return format === "jpg" ? "jpg" : format;
}
