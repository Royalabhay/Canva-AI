import type { UsageMetric } from "../types";
import { createBillingServiceClient } from "../services/supabase";
import { currentPeriod, ensureMonthlyCredits, getWorkspacePlanId, incrementUsage } from "../services/repository";

const CREDIT_COST: Record<Extract<UsageMetric, "ai_prompt" | "ai_image" | "ai_resize" | "ai_enhance">, number> = {
  ai_prompt: 5,
  ai_image: 20,
  ai_resize: 3,
  ai_enhance: 3
};

export async function consumeAiCredits(workspaceId: string, metric: keyof typeof CREDIT_COST, userId?: string, units = 1, metadata: Record<string, unknown> = {}) {
  const client = createBillingServiceClient();
  const planId = await getWorkspacePlanId(client, workspaceId);
  await ensureMonthlyCredits(client, workspaceId, planId);
  const cost = CREDIT_COST[metric] * units;
  const period = currentPeriod();
  const { data, error } = await (client as any).from("ai_credits").select("credits_granted,credits_used,overage_credits").eq("workspace_id", workspaceId).eq("period_start", period.start.toISOString()).maybeSingle();
  if (error) throw error;
  const granted = Number(data?.credits_granted ?? 0) + Number(data?.overage_credits ?? 0);
  const used = Number(data?.credits_used ?? 0);
  if (used + cost > granted) throw new Error("AI credit quota exceeded. Upgrade your plan or wait for the monthly reset.");
  const { error: updateError } = await (client as any).from("ai_credits").update({ credits_used: used + cost }).eq("workspace_id", workspaceId).eq("period_start", period.start.toISOString());
  if (updateError) throw updateError;
  await incrementUsage(client, workspaceId, metric, cost, userId, metadata);
  return { creditsUsed: used + cost, creditsGranted: granted, creditsRemaining: granted - used - cost, cost };
}

export async function getAiCreditBalance(workspaceId: string) {
  const client = createBillingServiceClient();
  await ensureMonthlyCredits(client, workspaceId);
  const period = currentPeriod();
  const { data, error } = await (client as any).from("ai_credits").select("*").eq("workspace_id", workspaceId).eq("period_start", period.start.toISOString()).maybeSingle();
  if (error) throw error;
  return data;
}
