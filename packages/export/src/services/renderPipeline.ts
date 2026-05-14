import { getServerEnv } from "@canva-ai/env/server";
import { renderExport } from "../renderers";
import { exportStoragePath } from "../utils/paths";
import type { ExportJobData, ExportResult } from "../types";
import { completeExport, recordRenderTask, updateExportProgress } from "./exportRepository";
import { createExportServiceClient, createSignedDownloadUrl, uploadBuffer } from "./supabaseStorage";

export async function processExportJob(data: ExportJobData, reportProgress?: (progress: number, message: string) => Promise<void> | void): Promise<ExportResult> {
  const env = getServerEnv();
  const client = createExportServiceClient();
  const progress = async (value: number, message: string) => {
    await reportProgress?.(value, message);
    await updateExportProgress(client, data.exportId, data.jobId, value >= 95 ? "uploading" : "rendering", value, message);
  };

  await updateExportProgress(client, data.exportId, data.jobId, "active", 5, "Export worker claimed job");
  await recordRenderTask(client, { exportId: data.exportId, jobId: data.jobId, status: "active", renderer: data.options.format, input: { pages: data.pages.length, options: data.options } });
  await progress(20, "Rendering design with Fabric.js");
  const artifact = await renderExport(data);
  await progress(80, "Optimizing rendered artifact");
  const bucket = env.SUPABASE_STORAGE_BUCKET_EXPORTS;
  const path = exportStoragePath(data.workspaceId, data.exportId, data.options.filename, data.options.format);
  await uploadBuffer(client, bucket, path, artifact.buffer, artifact.mimeType);
  await progress(95, "Creating signed download URL");
  const signed = await createSignedDownloadUrl(client, bucket, path);
  await recordRenderTask(client, { exportId: data.exportId, jobId: data.jobId, status: "completed", renderer: data.options.format, input: { pages: data.pages.length }, output: { bucket, path, bytes: artifact.bytes } });
  return completeExport(client, data, artifact, { bucket, path, signedUrl: signed.signedUrl, expiresAt: signed.expiresAt });
}
