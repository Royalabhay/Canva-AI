import type { Canvas, TMat2D } from "fabric";
import type { CanvasSnapshot } from "../types/editor";
import { EDITOR_OBJECT_PROPS } from "./object";

export function serializeCanvas(canvas: Canvas): CanvasSnapshot {
  const json = canvas.toObject([...EDITOR_OBJECT_PROPS]);
  return {
    ...(json as CanvasSnapshot),
    viewportTransform: canvas.viewportTransform ? [...canvas.viewportTransform] : undefined,
    zoom: canvas.getZoom()
  };
}

export async function deserializeCanvas(canvas: Canvas, snapshot: CanvasSnapshot): Promise<void> {
  await canvas.loadFromJSON(snapshot);
  if (snapshot.viewportTransform?.length === 6) canvas.setViewportTransform(snapshot.viewportTransform as TMat2D);
  if (snapshot.zoom) canvas.setZoom(snapshot.zoom);
  canvas.requestRenderAll();
}

export function snapshotsEqual(a: CanvasSnapshot | null, b: CanvasSnapshot | null): boolean {
  if (!a || !b) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}
