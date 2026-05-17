import { NextResponse } from "next/server";
import { requestExport } from "@canva-ai/export/server";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";

export async function POST(request: Request) {
  const db = await createSupabaseServerClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const body = await request.json();
  const ids = await requestExport({ ...body, requestedBy: user.id });
  return NextResponse.json(ids, { status: 202 });
}
