import type { ExportRequest, VideoCompositionPlan } from "../types";

export function prepareMp4Composition(request: ExportRequest): VideoCompositionPlan {
  const width = request.options.width ?? request.pages[0]?.width ?? 1920;
  const height = request.options.height ?? request.pages[0]?.height ?? 1080;
  return {
    format: "mp4",
    width,
    height,
    fps: 30,
    timeline: request.pages.map((page, index) => ({ pageId: page.id, startMs: index * 3000, durationMs: 3000, transitions: index === 0 ? [] : ["crossfade"] })),
    audioTracks: []
  };
}

export function buildFfmpegArguments(plan: VideoCompositionPlan, framePattern: string, outputPath: string): string[] {
  return ["-y", "-framerate", String(plan.fps), "-i", framePattern, "-vf", `scale=${plan.width}:${plan.height}:flags=lanczos,format=yuv420p`, "-movflags", "+faststart", outputPath];
}
