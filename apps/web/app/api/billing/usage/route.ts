import { NextResponse, type NextRequest } from "next/server";
import { getUsageDashboard } from "@canva-ai/billing/server";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspaceId");
  if (!workspaceId) return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
  const db = await createSupabaseServerClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { data: member } = await db.from("workspace_members").select("id").eq("workspace_id", workspaceId).eq("user_id", user.id).maybeSingle();
  if (!member) return NextResponse.json({ error: "Workspace access required" }, { status: 403 });
  return NextResponse.json(await getUsageDashboard(workspaceId));
}
