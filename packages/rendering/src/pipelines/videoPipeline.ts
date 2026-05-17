import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import { getServerEnv } from "@canva-ai/env/server";
import { cleanupTempDir } from "../utils/fs";
import { renderTimelineVideo } from "../video/timelineRenderer";
import { createRenderingServiceClient, signedUrl, uploadRenderOutput } from "../services/supabase";
import { recordRenderMetric, recordRenderOutput, updateRenderJob } from "../services/renderRepository";
import type { RenderJobData, RenderOutput } from "../types";

export async function processVideoRenderJob(data: RenderJobData, workerId: string, progress?: (value: number, message: string) => Promise<void> | void): Promise<RenderOutput> {
  const client = createRenderingServiceClient();
  await updateRenderJob(client, data.renderJobId, { status: "active", progress: 5, workerId });
  const rendered = await renderTimelineVideo(data, async (value, message) => { await progress?.(value, message); await updateRenderJob(client, data.renderJobId, { status: "rendering", progress: value }); });
  try {
    await updateRenderJob(client, data.renderJobId, { status: "uploading", progress: 92 });
    const env = getServerEnv();
    const buffer = await readFile(rendered.outputPath);
    const info = await stat(rendered.outputPath);
    const bucket = env.SUPABASE_STORAGE_BUCKET_EXPORTS;
    const path = `${data.workspaceId}/renders/${data.renderJobId}/${basename(rendered.outputPath)}`;
    const mimeType = data.output.format === "webm" ? "video/webm" : "video/mp4";
    await uploadRenderOutput(client, bucket, path, buffer, mimeType);
    const url = await signedUrl(client, bucket, path, env.SIGNED_DOWNLOAD_URL_TTL_SECONDS);
    const output: RenderOutput = { bucket, path, signedUrl: url, mimeType, sizeBytes: info.size, width: data.timeline?.width, height: data.timeline?.height, durationMs: rendered.durationMs, format: data.output.format };
    await recordRenderOutput(client, data.renderJobId, output);
    await recordRenderMetric(client, data.renderJobId, "frames", rendered.frameCount, "count");
    await recordRenderMetric(client, data.renderJobId, "ffmpeg_ms", rendered.ffmpegMs, "ms");
    await updateRenderJob(client, data.renderJobId, { status: "completed", progress: 100, output });
    return output;
  } finally { await cleanupTempDir(rendered.tempDir); }
}
