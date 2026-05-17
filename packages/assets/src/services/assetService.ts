import type { DbClient } from "@canva-ai/database";
import type { Asset, Json } from "@canva-ai/database/types";
import { classifyAssetKind } from "../upload/validation";

export interface AssetSearchInput {
  workspaceId: string;
  query?: string;
  kind?: "image" | "video" | "font" | "audio" | "document" | "other" | "all";
  folderId?: string | null;
  tags?: string[];
  favoritesOnly?: boolean;
  recentOnly?: boolean;
  limit?: number;
  cursor?: string;
}

export interface SignedWorkspaceUploadInput {
  workspaceId: string;
  userId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  folderId?: string;
  tags?: string[];
}

function safePathSegment(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "asset";
}

function bucketForContentType(contentType: string) {
  if (contentType.startsWith("video/")) return "videos";
  return "workspace-assets";
}

export async function searchAssets(db: DbClient, input: AssetSearchInput): Promise<Asset[]> {
  const limit = Math.min(Math.max(input.limit ?? 40, 1), 100);
  let query = (db.from("assets") as any).select("*").eq("workspace_id", input.workspaceId).is("deleted_at", null).order("created_at", { ascending: false }).limit(limit);
  if (input.kind && input.kind !== "all") query = query.eq("kind", input.kind);
  if (input.folderId !== undefined) query = input.folderId === null ? query.is("folder_id", null) : query.eq("folder_id", input.folderId);
  if (input.query) query = query.ilike("filename", `%${input.query.trim()}%`);
  if (input.tags?.length) query = query.contains("tags", input.tags);
  if (input.cursor) query = query.lt("created_at", input.cursor);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createSignedWorkspaceUpload(db: DbClient, input: SignedWorkspaceUploadInput): Promise<{ asset: Asset; signedUrl: string; token: string; path: string; bucket: string }> {
  const bucket = bucketForContentType(input.contentType);
  const path = `${input.workspaceId}/${input.userId}/${crypto.randomUUID()}-${safePathSegment(input.filename)}`;
  const { data: signed, error: signedError } = await (db.storage.from(bucket) as any).createSignedUploadUrl(path, { upsert: false });
  if (signedError) throw signedError;
  const { data, error } = await (db.from("assets") as any).insert({
    workspace_id: input.workspaceId,
    owner_id: input.userId,
    kind: classifyAssetKind(input.contentType),
    bucket,
    path,
    filename: input.filename,
    mime_type: input.contentType,
    size_bytes: input.sizeBytes,
    folder_id: input.folderId ?? null,
    tags: input.tags ?? [],
    status: "pending",
    metadata: { uploadTokenCreatedAt: new Date().toISOString() } as Json
  }).select("*").single();
  if (error) throw error;
  await (db.from("workspace_assets") as any).insert({ workspace_id: input.workspaceId, asset_id: data.id, created_by: input.userId });
  return { asset: data as Asset, signedUrl: signed.signedUrl, token: signed.token, path: signed.path, bucket };
}

export async function markAssetReady(db: DbClient, assetId: string, metadata: Record<string, unknown> = {}): Promise<Asset> {
  const { data, error } = await (db.from("assets") as any).update({ status: "ready", metadata }).eq("id", assetId).select("*").single();
  if (error) throw error;
  return data as Asset;
}

export async function recordAssetUse(db: DbClient, asset: Asset, userId: string): Promise<void> {
  await (db.from("assets") as any).update({ last_used_at: new Date().toISOString() }).eq("id", asset.id);
  await (db.from("asset_recent_events") as any).insert({ asset_id: asset.id, workspace_id: asset.workspace_id, user_id: userId, action: "used" });
}

export function getAssetDeliveryUrl(asset: Pick<Asset, "cdn_url" | "public_url" | "bucket" | "path">) {
  return asset.cdn_url ?? asset.public_url ?? null;
}
