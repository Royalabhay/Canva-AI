import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "../lib/supabase/server";

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data.user;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  return user;
}
