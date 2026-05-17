import { createSupabaseServerClient } from "../../../../../lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const db = await createSupabaseServerClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) return new Response("Authentication required", { status: 401 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const tick = async () => {
        const client = db as any;
        const { data } = await client.from("exports").select("id,status,progress,bucket,storage_path,mime_type,size_bytes,signed_url_expires_at,export_jobs(id,status,progress,last_error)").or(`id.eq.${jobId},export_jobs.id.eq.${jobId}`).eq("requested_by", user.id).maybeSingle();
        controller.enqueue(encoder.encode(`event: status\ndata: ${JSON.stringify(data ?? { id: jobId, status: "queued", progress: 0 })}\n\n`));
        const status = (data as { status?: string } | null)?.status;
        if (status === "completed" || status === "failed" || status === "cancelled") {
          controller.close();
          return;
        }
        setTimeout(tick, 1500);
      };
      await tick();
    }
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" } });
}
