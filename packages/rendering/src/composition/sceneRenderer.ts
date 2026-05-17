import { readFile } from "node:fs/promises";
import sharp from "sharp";
import type { TimelineLayer, TimelineScene, VideoTimeline } from "../types";
import { evaluateLayerAt } from "../timeline/serializer";

function svgEscape(input: string) { return input.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char] ?? char)); }
function textSvg(layer: TimelineLayer) { const width = layer.width ?? 800; const height = layer.height ?? 120; const size = Math.max(12, Math.min(height * 0.6, 96)); return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="0" y="${size}" font-family="Inter,Arial,sans-serif" font-size="${size}" fill="${layer.fill}">${svgEscape(layer.text ?? "")}</text></svg>`); }
function shapeSvg(layer: TimelineLayer) { const w = layer.width ?? 100; const h = layer.height ?? 100; const body = layer.shape === "ellipse" ? `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}" fill="${layer.fill}"/>` : `<rect width="${w}" height="${h}" rx="12" fill="${layer.fill}"/>`; return Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`); }

async function layerInput(layer: TimelineLayer): Promise<Buffer | null> {
  if (layer.type === "text") return textSvg(layer);
  if (layer.type === "shape") return shapeSvg(layer);
  if (layer.type === "image" && layer.src) return readFile(layer.src);
  return null;
}

export async function renderSceneFrame(timeline: VideoTimeline, scene: TimelineScene, localTimeMs: number): Promise<Buffer> {
  const composites = [] as sharp.OverlayOptions[];
  const active = scene.layers.map((layer) => evaluateLayerAt(layer, localTimeMs)).filter((layer): layer is TimelineLayer => layer !== null && layer.type !== "audio").sort((a, b) => a.zIndex - b.zIndex);
  for (const layer of active) {
    const input = await layerInput(layer);
    if (!input) continue;
    const resized = await sharp(input, { limitInputPixels: false }).resize(layer.width ? Math.round(layer.width) : undefined, layer.height ? Math.round(layer.height) : undefined, { fit: "cover" }).png().toBuffer();
    composites.push({ input: resized, left: Math.round(layer.x), top: Math.round(layer.y), blend: "over" });
  }
  return sharp({ create: { width: timeline.width, height: timeline.height, channels: 4, background: scene.background } }).composite(composites).png().toBuffer();
}
