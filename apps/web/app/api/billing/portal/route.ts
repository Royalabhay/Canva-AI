import { NextResponse, type NextRequest } from "next/server";
import { createBillingPortalSession } from "@canva-ai/billing/server";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const db = await createSupabaseServerClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const session = await createBillingPortalSession(await request.json(), user.id);
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to open billing portal" }, { status: 400 });
  }
}
