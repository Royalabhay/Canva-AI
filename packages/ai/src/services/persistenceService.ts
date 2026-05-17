import type { DbClient } from "@canva-ai/database";
import type { Json } from "@canva-ai/database/types";
import type { DesignGenerationRequest, DesignWorkflowState } from "../types/design";
import { sanitizePrompt } from "../utils/sanitize";

async function sha256(input: string) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createAiWorkflowRecord(db: DbClient, request: DesignGenerationRequest, userId?: string) {
  const { data, error } = await (db.from("ai_workflows") as any).insert({ workspace_id: request.workspaceId ?? null, user_id: userId ?? null, workflow_type: "prompt_to_design", status: "running", input: request as Json, started_at: new Date().toISOString() }).select("*").single();
  if (error) throw error;
  return data as { id: string };
}

export async function completeAiWorkflowRecord(db: DbClient, workflowId: string, state: DesignWorkflowState) {
  await (db.from("ai_workflows") as any).update({ status: "completed", output: state as unknown as Json, trace: state.trace as unknown as Json, completed_at: new Date().toISOString() }).eq("id", workflowId);
  await (db.from("ai_generations") as any).insert({ workflow_id: workflowId, workspace_id: state.request.workspaceId ?? null, generation_type: "design", prompt: state.request.prompt, result: state as unknown as Json, fabric_json: state.fabricJson as unknown as Json, status: "completed", model: process.env.OPENAI_MODEL ?? "gpt-4o", metadata: { score: state.score } });
}

export async function failAiWorkflowRecord(db: DbClient, workflowId: string, error: unknown) {
  await (db.from("ai_workflows") as any).update({ status: "failed", error: error instanceof Error ? error.message : String(error), completed_at: new Date().toISOString() }).eq("id", workflowId);
}

export async function recordPromptHistory(db: DbClient, request: DesignGenerationRequest, userId?: string) {
  const sanitized = sanitizePrompt(request.prompt);
  await (db.from("ai_prompt_history") as any).insert({ workspace_id: request.workspaceId ?? null, user_id: userId ?? null, prompt: request.prompt, sanitized_prompt: sanitized, prompt_hash: await sha256(sanitized), workflow_type: request.mode, metadata: { target: request.target } });
}
