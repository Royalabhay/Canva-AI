import { type NextRequest } from "next/server";
import { streamDesignFromPrompt, designGenerationRequestSchema } from "@canva-ai/ai";
import { getCurrentUser } from "../../../../server/auth";
import { consumeAiCredits } from "@canva-ai/billing/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const payload = designGenerationRequestSchema.parse(await request.json());
  const user = await getCurrentUser();
  if (payload.workspaceId) await consumeAiCredits(payload.workspaceId, "ai_prompt", user?.id, 1, { mode: payload.mode, target: payload.target, streaming: true });
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of streamDesignFromPrompt(payload, user?.id ?? "anonymous")) {
          controller.enqueue(encoder.encode(`event: update\ndata: ${JSON.stringify(event)}\n\n`));
        }
        controller.enqueue(encoder.encode("event: done\ndata: {}\n\n"));
      } catch (error) {
        controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: error instanceof Error ? error.message : "AI stream failed" })}\n\n`));
      } finally {
        controller.close();
      }
    }
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" } });
}
