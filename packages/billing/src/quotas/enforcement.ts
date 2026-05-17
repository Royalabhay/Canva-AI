import type { BillingPlanId, QuotaCheckResult, UsageMetric } from "../types";
import { getBillingPlan } from "../plans/catalog";
import { createBillingServiceClient } from "../services/supabase";
import { getMetricUsage, getWorkspacePlanId, incrementUsage } from "../services/repository";

function limitForMetric(planId: BillingPlanId, metric: UsageMetric): number | null {
  const limits = getBillingPlan(planId).limits;
  switch (metric) {
    case "ai_prompt":
    case "ai_image":
    case "ai_resize":
    case "ai_enhance": return limits.aiCredits;
    case "export": return limits.exports;
    case "premium_export": return limits.premiumExports;
    case "storage_bytes": return limits.storageBytes;
    case "seat": return limits.seats;
  }
}

export async function checkQuota(workspaceId: string, metric: UsageMetric, amount = 1): Promise<QuotaCheckResult> {
  const client = createBillingServiceClient();
  const planId = await getWorkspacePlanId(client, workspaceId);
  const limit = limitForMetric(planId, metric);
  const used = await getMetricUsage(client, workspaceId, metric);
  const allowed = limit === null || used + amount <= limit;
  return { allowed, planId, metric, limit, used, remaining: limit === null ? null : Math.max(0, limit - used), upgradeRequired: !allowed, reason: allowed ? undefined : `${metric} quota exceeded for ${planId} plan` };
}

export async function assertQuota(workspaceId: string, metric: UsageMetric, amount = 1): Promise<QuotaCheckResult> {
  const result = await checkQuota(workspaceId, metric, amount);
  if (!result.allowed) throw new Error(result.reason ?? "Quota exceeded. Please upgrade your plan.");
  return result;
}

export async function reserveQuota(workspaceId: string, metric: UsageMetric, amount = 1, userId?: string, metadata: Record<string, unknown> = {}): Promise<QuotaCheckResult> {
  const result = await assertQuota(workspaceId, metric, amount);
  const client = createBillingServiceClient();
  await incrementUsage(client, workspaceId, metric, amount, userId, metadata);
  return result;
}

export async function assertFeature(workspaceId: string, feature: "premiumTemplates" | "advancedExports" | "teamCollaboration"): Promise<void> {
  const client = createBillingServiceClient();
  const planId = await getWorkspacePlanId(client, workspaceId);
  if (!getBillingPlan(planId).limits[feature]) throw new Error(`${feature} requires a paid plan.`);
}
