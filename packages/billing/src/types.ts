import { z } from "zod";

export const planIdSchema = z.enum(["free", "pro", "team", "enterprise"]);
export type BillingPlanId = z.infer<typeof planIdSchema>;
export const billingIntervalSchema = z.enum(["month", "year"]);
export type BillingInterval = z.infer<typeof billingIntervalSchema>;
export const usageMetricSchema = z.enum(["ai_prompt", "ai_image", "ai_resize", "ai_enhance", "export", "premium_export", "storage_bytes", "seat"]);
export type UsageMetric = z.infer<typeof usageMetricSchema>;

export interface PlanLimits {
  aiCredits: number;
  exports: number;
  premiumExports: number;
  storageBytes: number;
  seats: number;
  projects: number | null;
  premiumTemplates: boolean;
  advancedExports: boolean;
  teamCollaboration: boolean;
}

export interface BillingPlan {
  id: BillingPlanId;
  name: string;
  description: string;
  monthlyPriceCents: number | null;
  annualPriceCents: number | null;
  stripeMonthlyPriceEnv?: string;
  stripeAnnualPriceEnv?: string;
  limits: PlanLimits;
  features: string[];
}

export const checkoutRequestSchema = z.object({
  workspaceId: z.string().uuid(),
  planId: z.enum(["pro", "team"]),
  interval: billingIntervalSchema.default("month"),
  seats: z.number().int().positive().max(500).default(1),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional()
});
export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

export const portalRequestSchema = z.object({
  workspaceId: z.string().uuid(),
  returnUrl: z.string().url().optional()
});
export type PortalRequest = z.infer<typeof portalRequestSchema>;

export interface QuotaCheckResult {
  allowed: boolean;
  planId: BillingPlanId;
  metric: UsageMetric;
  limit: number | null;
  used: number;
  remaining: number | null;
  upgradeRequired: boolean;
  reason?: string;
}
