import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@canva-ai/database/types";
import { getServerEnv } from "@canva-ai/env/server";

export type ExportSupabaseClient = SupabaseClient<Database>;

export function createExportServiceClient(): ExportSupabaseClient {
  const env = getServerEnv();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function uploadBuffer(client: ExportSupabaseClient, bucket: string, path: string, buffer: Buffer, contentType: string): Promise<void> {
  const { error } = await client.storage.from(bucket).upload(path, buffer, { contentType, upsert: true, cacheControl: "31536000" });
  if (error) throw error;
}

export async function createSignedDownloadUrl(client: ExportSupabaseClient, bucket: string, path: string, ttlSeconds?: number): Promise<{ signedUrl: string; expiresAt: string }> {
  const env = getServerEnv();
  const ttl = ttlSeconds ?? env.SIGNED_DOWNLOAD_URL_TTL_SECONDS;
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, ttl, { download: true });
  if (error || !data?.signedUrl) throw error ?? new Error("Unable to create signed export URL");
  return { signedUrl: data.signedUrl, expiresAt: new Date(Date.now() + ttl * 1000).toISOString() };
}

export async function removeStorageObject(client: ExportSupabaseClient, bucket: string, path: string): Promise<void> {
  const { error } = await client.storage.from(bucket).remove([path]);
  if (error) throw error;
}
