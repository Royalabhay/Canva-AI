import sharp from "sharp";
import { getServerEnv } from "@canva-ai/env/server";
import { renderImage } from "../renderers/imageRenderer";
import { thumbnailStoragePath } from "../utils/paths";
import type { ThumbnailRequest, ThumbnailResult } from "../types";
import { createExportServiceClient, createSignedDownloadUrl, uploadBuffer } from "./supabaseStorage";

export async function generateThumbnail(request: ThumbnailRequest): Promise<ThumbnailResult> {
  const env = getServerEnv();
  const width = request.width ?? 512;
  const height = request.height ?? Math.round(width * (request.page.height / request.page.width));
  const artifact = await renderImage(request.page, { format: "png", width, height, scale: 1, quality: 86, transparentBackground: false, embedAssets: true, printDpi: 144 });
  const webp = await sharp(artifact.buffer).resize(width, height, { fit: "cover" }).webp({ quality: 82, effort: 5 }).toBuffer();
  const client = createExportServiceClient();
  const bucket = env.SUPABASE_STORAGE_BUCKET_THUMBNAILS ?? "thumbnails";
  const path = thumbnailStoragePath(request.workspaceId, request.subjectType, request.subjectId);
  await uploadBuffer(client, bucket, path, webp, "image/webp");
  const signed = await createSignedDownloadUrl(client, bucket, path);
  const { error } = await (client as any).from("thumbnails").upsert({ workspace_id: request.workspaceId, subject_id: request.subjectId, subject_type: request.subjectType, bucket, storage_path: path, width, height, mime_type: "image/webp", size_bytes: webp.byteLength, metadata: {} }, { onConflict: "workspace_id,subject_type,subject_id" }).select("id").single();
  if (error) throw error;
  return { bucket, path, signedUrl: signed.signedUrl, width, height };
}
