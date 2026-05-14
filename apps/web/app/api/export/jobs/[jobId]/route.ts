import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../../lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const db = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const client = db as any;
  const { data, error } = await client.from("exports").select("*, export_jobs(*)").or(`id.eq.${jobId},export_jobs.id.eq.${jobId}`).eq("requested_by", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Export job not found" }, { status: 404 });
  const row = data as { status?: string; bucket?: string | null; storage_path?: string | null };
  if (row.status === "completed" && row.bucket && row.storage_path) {
    const { data: signed } = await db.storage.from(row.bucket).createSignedUrl(row.storage_path, 3600, { download: true });
    return NextResponse.json({ ...(data as Record<string, unknown>), signed_url: signed?.signedUrl });
  }
  return NextResponse.json(data);
}
