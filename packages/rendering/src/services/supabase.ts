import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@canva-ai/database/types";
import { getServerEnv } from "@canva-ai/env/server";
export type RenderingDb = SupabaseClient<Database>;
export function createRenderingServiceClient(): RenderingDb { const env = getServerEnv(); return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }); }
export async function uploadRenderOutput(client: RenderingDb, bucket: string, path: string, body: Buffer, contentType: string) { const { error } = await client.storage.from(bucket).upload(path, body, { upsert: true, contentType, cacheControl: "31536000" }); if (error) throw error; }
export async function signedUrl(client: RenderingDb, bucket: string, path: string, ttl = 3600) { const { data, error } = await client.storage.from(bucket).createSignedUrl(path, ttl, { download: true }); if (error || !data?.signedUrl) throw error ?? new Error("Unable to sign render output"); return data.signedUrl; }
