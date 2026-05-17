import { readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getServerEnv } from "@canva-ai/env/server";
import { transcodeVideoArgs, thumbnailArgs } from "../ffmpeg/commands";
import { runFfmpeg } from "../ffmpeg/runner";
import { createRenderTempDir, cleanupTempDir } from "../utils/fs";
import { createRenderingServiceClient, signedUrl, uploadRenderOutput } from "../services/supabase";
import { recordRenderMetric, recordRenderOutput, updateRenderJob } from "../services/renderRepository";
import type { RenderJobData, RenderOutput } from "../types";

export async function processTranscodeJob(data: RenderJobData, workerId: string): Promise<RenderOutput> {
  if (!data.source) throw new Error("Transcode job requires source");
  const client = createRenderingServiceClient();
  await updateRenderJob(client, data.renderJobId, { status: "active", progress: 5, workerId });
  const tempDir = await createRenderTempDir("canva-transcode-");
  try {
    const { data: source, error } = await client.storage.from(data.source.bucket).download(data.source.path);
    if (error || !source) throw error ?? new Error("Source asset download failed");
    const input = join(tempDir, "input");
    const outputPath = join(tempDir, `${data.output.filename}.${data.output.format}`);
    await writeFile(input, Buffer.from(await source.arrayBuffer()));
    await updateRenderJob(client, data.renderJobId, { status: "rendering", progress: 50 });
    const result = await runFfmpeg(transcodeVideoArgs(input, outputPath, data.output.format));
    const buffer = await readFile(outputPath); const info = await stat(outputPath);
    const env = getServerEnv(); const bucket = env.SUPABASE_STORAGE_BUCKET_EXPORTS; const path = `${data.workspaceId}/transcodes/${data.renderJobId}/${data.output.filename}.${data.output.format}`; const mimeType = data.output.format === "webm" ? "video/webm" : "video/mp4";
    await uploadRenderOutput(client, bucket, path, buffer, mimeType);
    const url = await signedUrl(client, bucket, path, env.SIGNED_DOWNLOAD_URL_TTL_SECONDS);
    const output: RenderOutput = { bucket, path, signedUrl: url, mimeType, sizeBytes: info.size, format: data.output.format };
    await recordRenderOutput(client, data.renderJobId, output); await recordRenderMetric(client, data.renderJobId, "ffmpeg_ms", result.durationMs, "ms"); await updateRenderJob(client, data.renderJobId, { status: "completed", progress: 100, output }); return output;
  } finally { await cleanupTempDir(tempDir); }
}

export async function processThumbnailJob(data: RenderJobData, workerId: string): Promise<RenderOutput> {
  if (!data.source) throw new Error("Thumbnail job requires source");
  const client = createRenderingServiceClient(); await updateRenderJob(client, data.renderJobId, { status: "active", progress: 10, workerId });
  const tempDir = await createRenderTempDir("canva-thumb-");
  try {
    const { data: source, error } = await client.storage.from(data.source.bucket).download(data.source.path); if (error || !source) throw error ?? new Error("Source download failed");
    const input = join(tempDir, "input"); const outputPattern = join(tempDir, "thumb-%03d.jpg"); await writeFile(input, Buffer.from(await source.arrayBuffer()));
    const result = await runFfmpeg(thumbnailArgs(input, outputPattern, 1));
    const outputPath = join(tempDir, "thumb-001.jpg"); const buffer = await readFile(outputPath); const info = await stat(outputPath);
    const env = getServerEnv(); const bucket = env.SUPABASE_STORAGE_BUCKET_THUMBNAILS; const path = `${data.workspaceId}/previews/${data.renderJobId}/thumb.jpg`;
    await uploadRenderOutput(client, bucket, path, buffer, "image/jpeg"); const url = await signedUrl(client, bucket, path, env.SIGNED_DOWNLOAD_URL_TTL_SECONDS);
    const output: RenderOutput = { bucket, path, signedUrl: url, mimeType: "image/jpeg", sizeBytes: info.size, format: "jpg" };
    await recordRenderOutput(client, data.renderJobId, output); await recordRenderMetric(client, data.renderJobId, "ffmpeg_ms", result.durationMs, "ms"); await updateRenderJob(client, data.renderJobId, { status: "completed", progress: 100, output }); return output;
  } finally { await cleanupTempDir(tempDir); }
}
