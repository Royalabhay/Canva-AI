import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { imageSequenceToVideoArgs } from "../ffmpeg/commands";
import { runFfmpeg } from "../ffmpeg/runner";
import { renderSceneFrame } from "../composition/sceneRenderer";
import { createRenderTempDir, cleanupTempDir } from "../utils/fs";
import type { RenderRequest, VideoTimeline } from "../types";

export interface TimelineRenderResult { outputPath: string; durationMs: number; frameCount: number; ffmpegMs: number; tempDir: string }

export async function renderTimelineVideo(request: RenderRequest, onProgress?: (progress: number, message: string) => void): Promise<TimelineRenderResult> {
  if (!request.timeline) throw new Error("Video render requires a timeline");
  const timeline = request.timeline as VideoTimeline;
  const tempDir = await createRenderTempDir("canva-video-");
  let frameIndex = 0;
  try {
    for (const scene of timeline.scenes) {
      const frames = Math.max(1, Math.round((scene.durationMs / 1000) * timeline.fps));
      for (let i = 0; i < frames; i += 1) {
        const localTimeMs = Math.round((i / timeline.fps) * 1000);
        const png = await renderSceneFrame(timeline, scene, localTimeMs);
        await writeFile(join(tempDir, `frame-${String(frameIndex).padStart(8, "0")}.png`), png);
        frameIndex += 1;
        if (frameIndex % Math.max(1, Math.round(timeline.fps)) === 0) onProgress?.(Math.min(75, Math.round((frameIndex / Math.max(1, totalFrames(timeline))) * 75)), `Rendered ${frameIndex} frames`);
      }
    }
    const outputPath = join(tempDir, `${request.output.filename}.${request.output.format}`);
    const started = Date.now();
    await runFfmpeg(imageSequenceToVideoArgs(join(tempDir, "frame-%08d.png"), outputPath, timeline.fps, request.output.format, request.output.transparent), (stderr) => { if (stderr.includes("frame=")) onProgress?.(85, "Encoding video with FFmpeg"); });
    return { outputPath, durationMs: timeline.scenes.reduce((sum, scene) => sum + scene.durationMs, 0), frameCount: frameIndex, ffmpegMs: Date.now() - started, tempDir };
  } catch (error) { await cleanupTempDir(tempDir); throw error; }
}

function totalFrames(timeline: VideoTimeline) { return timeline.scenes.reduce((sum, scene) => sum + Math.max(1, Math.round((scene.durationMs / 1000) * timeline.fps)), 0); }
