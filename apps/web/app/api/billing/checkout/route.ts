import { NextResponse, type NextRequest } from "next/server";
import { createCheckoutSession } from "@canva-ai/billing/server";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const db = await createSupabaseServerClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const session = await createCheckoutSession(await request.json(), { id: user.id, email: user.email });
    return NextResponse.json({ id: session.id, url: session.url });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create checkout session" }, { status: 400 });
  }
}
