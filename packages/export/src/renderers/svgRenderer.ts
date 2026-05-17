import { createFabricRenderPage } from "./browser";
import { mimeForFormat } from "../utils/mime";
import type { DesignPage, RenderOptions, RenderedArtifact } from "../types";

export async function renderSvg(page: DesignPage, options: RenderOptions): Promise<RenderedArtifact> {
  const browserPage = await createFabricRenderPage(page, options.transparentBackground);
  try {
    const svg = await browserPage.evaluate(() => {
      const canvas = (window as unknown as { __CANVA_EXPORT_CANVAS__: { toSVG: (options?: unknown) => string } }).__CANVA_EXPORT_CANVAS__;
      return canvas.toSVG({ suppressPreamble: false });
    });
    const optimized = optimizeSvg(svg, page, options);
    const buffer = Buffer.from(optimized, "utf8");
    return { buffer, format: "svg", width: options.width ?? page.width, height: options.height ?? page.height, mimeType: mimeForFormat("svg"), extension: "svg", bytes: buffer.byteLength, pageCount: 1, metadata: { editable: true, embedAssets: options.embedAssets } };
  } finally {
    await browserPage.close();
  }
}

function optimizeSvg(svg: string, page: DesignPage, options: RenderOptions): string {
  const width = options.width ?? page.width;
  const height = options.height ?? page.height;
  return svg
    .replace(/<\?xml[^>]*>\s*/i, "")
    .replace(/<!DOCTYPE[^>]*>\s*/i, "")
    .replace(/\s(data-fabric-[^=]+="[^"]*")/g, "")
    .replace(/<svg([^>]*)>/i, `<svg$1 width="${width}" height="${height}" viewBox="0 0 ${page.width} ${page.height}" role="img" xmlns="http://www.w3.org/2000/svg">`)
    .replace(/\n{2,}/g, "\n")
    .trim();
}
