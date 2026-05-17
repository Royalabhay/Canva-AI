import { videoTimelineSchema, type TimelineLayer, type VideoTimeline } from "../types";
import { ease, interpolateNumber } from "./easing";

export function parseTimeline(input: unknown): VideoTimeline { return videoTimelineSchema.parse(input); }
export function timelineDurationMs(timeline: VideoTimeline) { return timeline.scenes.reduce((sum, scene) => sum + scene.durationMs, 0); }

export function evaluateLayerAt(layer: TimelineLayer, localTimeMs: number): TimelineLayer | null {
  if (localTimeMs < layer.startMs || localTimeMs > layer.startMs + layer.durationMs) return null;
  const evaluated = structuredClone(layer) as TimelineLayer;
  const relative = localTimeMs - layer.startMs;
  for (const track of layer.animations) {
    const frames = [...track.keyframes].sort((a, b) => a.timeMs - b.timeMs);
    const prev = [...frames].reverse().find((frame) => frame.timeMs <= relative) ?? frames[0];
    const next = frames.find((frame) => frame.timeMs >= relative) ?? frames[frames.length - 1];
    if (!prev || !next) continue;
    const span = Math.max(1, next.timeMs - prev.timeMs);
    const progress = prev === next ? 1 : ease((relative - prev.timeMs) / span, next.easing);
    if (typeof prev.value === "number" && typeof next.value === "number") (evaluated as unknown as Record<string, unknown>)[track.property] = interpolateNumber(prev.value, next.value, progress);
    else (evaluated as unknown as Record<string, unknown>)[track.property] = progress < 1 ? prev.value : next.value;
  }
  return evaluated;
}
