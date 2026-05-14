import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getServerEnv } from "@canva-ai/env/server";
import type { Database } from "../types/database";

export type DbClient = SupabaseClient<Database>;

export function createServiceDatabaseClient(): DbClient {
  const env = getServerEnv();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { "X-Client-Info": "canva-ai-service" } }
  });
}

export function createAnonDatabaseClient(accessToken?: string): DbClient {
  const env = getServerEnv();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined }
  });
}
