import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@canva-ai/database/types";

const localSupabaseUrl = "http://127.0.0.1:54321";
const localAnonKey = "dev-local-anon-key";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || localSupabaseUrl;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || localAnonKey;

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  const protectedPath = request.nextUrl.pathname.startsWith("/dashboard") || request.nextUrl.pathname.startsWith("/projects") || request.nextUrl.pathname.startsWith("/assets") || request.nextUrl.pathname.startsWith("/brand-kit");

  if (protectedPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return response;
}
