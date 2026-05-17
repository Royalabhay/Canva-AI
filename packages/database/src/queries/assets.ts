import { getServerEnv } from "@canva-ai/env/server";
import type { DbClient } from "../client";
import type { Asset } from "../types/database";
import { createSignedUploadSchema, type CreateSignedUploadInput } from "../schema/validation";
import { assertResult } from "./errors";

function safePathSegment(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "asset";
}

export async function createSignedAssetUpload(db: DbClient, userId: string, input: CreateSignedUploadInput): Promise<{ asset: Asset; token: string; path: string; bucket: string; signedUrl: string }> {
  const env = getServerEnv();
  const payload = createSignedUploadSchema.parse(input);
  const bucket = env.SUPABASE_STORAGE_BUCKET_UPLOADS;
  const path = `${payload.workspaceId}/${userId}/${crypto.randomUUID()}-${safePathSegment(payload.filename)}`;
  const { data: signed, error: signedError } = await (db.storage.from(bucket) as any).createSignedUploadUrl(path, { upsert: false });
  if (signedError) throw signedError;

  const { data, error } = await (db.from("assets") as any).insert({
    workspace_id: payload.workspaceId,
    owner_id: userId,
    kind: payload.kind,
    bucket,
    path,
    filename: payload.filename,
    mime_type: payload.contentType,
    size_bytes: payload.sizeBytes ?? null,
    metadata: { uploadPending: true }
  }).select("*").single();

  return { asset: assertResult(data, error), token: signed.token, path: signed.path, bucket, signedUrl: signed.signedUrl };
}

export async function createSignedAssetDownload(db: DbClient, asset: Pick<Asset, "bucket" | "path">): Promise<string> {
  const env = getServerEnv();
  const { data, error } = await (db.storage.from(asset.bucket) as any).createSignedUrl(asset.path, env.SIGNED_DOWNLOAD_URL_TTL_SECONDS);
  if (error) throw error;
  return data.signedUrl;
}
