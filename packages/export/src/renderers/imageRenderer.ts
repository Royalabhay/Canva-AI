import sharp from "sharp";
import { createFabricRenderPage } from "./browser";
import { mimeForFormat } from "../utils/mime";
import type { DesignPage, RenderOptions, RenderedArtifact } from "../types";

export async function renderImage(page: DesignPage, options: RenderOptions): Promise<RenderedArtifact> {
  if (options.format !== "png" && options.format !== "jpg") throw new Error(`Unsupported image format: ${options.format}`);
  const renderWidth = options.width ?? page.width;
  const renderHeight = options.height ?? page.height;
  const scaleX = renderWidth / page.width;
  const scaleY = renderHeight / page.height;
  const scale = options.scale * Math.min(scaleX, scaleY);
  const screenshotWidth = Math.max(1, Math.round(page.width * scale));
  const screenshotHeight = Math.max(1, Math.round(page.height * scale));
  const renderPage = { ...page, width: screenshotWidth, height: screenshotHeight, fabricJson: scaleFabricJson(page.fabricJson, scale) };
  const browserPage = await createFabricRenderPage(renderPage, options.transparentBackground && options.format === "png");
  try {
    const raw = Buffer.from(await browserPage.screenshot({ type: "png", omitBackground: options.transparentBackground && options.format === "png", clip: { x: 0, y: 0, width: screenshotWidth, height: screenshotHeight } }));
    const pipeline = sharp(raw, { limitInputPixels: false }).rotate();
    const buffer = options.format === "png"
      ? await pipeline.png({ compressionLevel: 9, effort: 9, adaptiveFiltering: true }).toBuffer()
      : await pipeline.flatten({ background: page.background ?? "#ffffff" }).jpeg({ quality: options.quality, mozjpeg: true }).toBuffer();
    const metadata = await sharp(buffer).metadata();
    return { buffer, format: options.format, width: metadata.width, height: metadata.height, mimeType: mimeForFormat(options.format), extension: options.format, bytes: buffer.byteLength, pageCount: 1, metadata: { quality: options.quality, scale } };
  } finally {
    await browserPage.close();
  }
}

function scaleFabricJson(json: Record<string, unknown>, scale: number): Record<string, unknown> {
  if (scale === 1) return json;
  const next = structuredClone(json) as Record<string, unknown>;
  const objects = Array.isArray(next.objects) ? next.objects as Array<Record<string, unknown>> : [];
  for (const object of objects) {
    if (typeof object.left === "number") object.left *= scale;
    if (typeof object.top === "number") object.top *= scale;
    object.scaleX = typeof object.scaleX === "number" ? object.scaleX * scale : scale;
    object.scaleY = typeof object.scaleY === "number" ? object.scaleY * scale : scale;
  }
  return next;
}
