import { renderImage } from "./imageRenderer";
import { renderPdf } from "./pdfRenderer";
import { prepareMp4Composition } from "./mp4Preparation";
import { renderSvg } from "./svgRenderer";
import type { ExportRequest, RenderedArtifact } from "../types";

export async function renderExport(request: ExportRequest): Promise<RenderedArtifact> {
  const options = request.options;
  if (options.format === "png" || options.format === "jpg") return renderImage(request.pages[0], options);
  if (options.format === "svg") return renderSvg(request.pages[0], options);
  if (options.format === "pdf") return renderPdf(request.pages, options);
  if (options.format === "mp4") {
    const plan = prepareMp4Composition(request);
    throw new Error(`MP4 rendering is prepared but intentionally disabled until video workers are enabled. Composition: ${JSON.stringify(plan)}`);
  }
  throw new Error(`Unsupported export format: ${String(options.format)}`);
}

export { renderImage } from "./imageRenderer";
export { renderPdf } from "./pdfRenderer";
export { renderSvg } from "./svgRenderer";
export { buildFfmpegArguments, prepareMp4Composition } from "./mp4Preparation";
