"use server";

import { generateDesignFromPrompt, resizeDesign, designGenerationRequestSchema, resizeRequestSchema } from "@canva-ai/ai";
import { createSupabaseServerClient } from "../lib/supabase/server";
import { getCurrentUser } from "../server/auth";
import { completeAiWorkflowRecord, createAiWorkflowRecord, failAiWorkflowRecord, recordPromptHistory } from "@canva-ai/ai";
import { consumeAiCredits } from "@canva-ai/billing/server";

export async function generateDesignAction(input: unknown) {
  const request = designGenerationRequestSchema.parse(input);
  const user = await getCurrentUser();
  const db = await createSupabaseServerClient();
  const workflow = request.workspaceId ? await createAiWorkflowRecord(db, request, user?.id) : null;
  try {
    if (request.workspaceId) {
      await consumeAiCredits(request.workspaceId, "ai_prompt", user?.id, 1, { mode: request.mode, target: request.target });
      await recordPromptHistory(db, request, user?.id);
    }
    const result = await generateDesignFromPrompt(request, user?.id ?? "anonymous");
    if (workflow) await completeAiWorkflowRecord(db, workflow.id, result as never);
    return { ok: true, data: result } as const;
  } catch (error) {
    if (workflow) await failAiWorkflowRecord(db, workflow.id, error);
    return { ok: false, error: error instanceof Error ? error.message : "AI generation failed" } as const;
  }
}

export async function resizeDesignAction(input: unknown) {
  try {
    const request = resizeRequestSchema.parse(input);
    const result = await resizeDesign(request);
    return { ok: true, data: result } as const;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "AI resize failed" } as const;
  }
}
