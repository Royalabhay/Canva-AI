import type { UsageMetric } from "../types";
import { createBillingServiceClient } from "../services/supabase";
import { currentPeriod, incrementUsage } from "../services/repository";

export async function trackUsage(workspaceId: string, metric: UsageMetric, quantity: number, userId?: string, metadata: Record<string, unknown> = {}) {
  const client = createBillingServiceClient();
  return incrementUsage(client, workspaceId, metric, quantity, userId, metadata);
}

export async function getUsageDashboard(workspaceId: string) {
  const client = createBillingServiceClient();
  const period = currentPeriod();
  const { data: quotaUsage, error: usageError } = await (client as any).from("quota_usage").select("*").eq("workspace_id", workspaceId).eq("period_start", period.start.toISOString());
  if (usageError) throw usageError;
  const { data: billing, error: billingError } = await (client as any).from("workspace_billing").select("*").eq("workspace_id", workspaceId).maybeSingle();
  if (billingError) throw billingError;
  const { data: credits, error: creditsError } = await (client as any).from("ai_credits").select("*").eq("workspace_id", workspaceId).eq("period_start", period.start.toISOString()).maybeSingle();
  if (creditsError) throw creditsError;
  return { period: { start: period.start.toISOString(), end: period.end.toISOString() }, billing, credits, quotaUsage: quotaUsage ?? [] };
}
