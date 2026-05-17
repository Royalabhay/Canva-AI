"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getClientEnv } from "@canva-ai/env/client";
import type { Database } from "@canva-ai/database/types";

export function createSupabaseBrowserClient() {
  const env = getClientEnv();
  return createBrowserClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
