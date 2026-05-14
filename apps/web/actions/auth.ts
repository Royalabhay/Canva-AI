"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getServerEnv } from "@canva-ai/env/server";
import { createSupabaseServerClient } from "../lib/supabase/server";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export async function signInWithPassword(formData: FormData) {
  const parsed = credentialsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter a valid email and password." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };
  redirect("/dashboard");
}

export async function signUpWithPassword(formData: FormData) {
  const parsed = credentialsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter a valid email and password." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp(parsed.data);
  if (error) return { error: error.message };
  redirect("/dashboard");
}

export async function signInWithOAuth(provider: "google" | "github") {
  const env = getServerEnv();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: env.AUTH_REDIRECT_URL } });
  if (error) return { error: error.message };
  if (data.url) redirect(data.url);
  return { error: "Unable to start OAuth flow." };
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
