import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@canva-ai/database/types";
import { getServerEnv } from "@canva-ai/env/server";

export type BillingSupabaseClient = SupabaseClient<Database>;

export function createBillingServiceClient(): BillingSupabaseClient {
  const env = getServerEnv();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}
