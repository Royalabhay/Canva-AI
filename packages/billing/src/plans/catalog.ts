import type { BillingPlan, BillingPlanId } from "../types";

export const BILLING_PLANS: Record<BillingPlanId, BillingPlan> = {
  free: {
    id: "free",
    name: "Free",
    description: "Start designing with core editor features and limited AI/export usage.",
    monthlyPriceCents: 0,
    annualPriceCents: 0,
    limits: { aiCredits: 50, exports: 10, premiumExports: 0, storageBytes: 1_073_741_824, seats: 1, projects: 10, premiumTemplates: false, advancedExports: false, teamCollaboration: false },
    features: ["10 exports/month", "50 AI credits/month", "1 GB storage", "Basic templates", "Watermarked high-res exports"]
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "For creators who need premium templates, advanced exports, and more AI.",
    monthlyPriceCents: 1500,
    annualPriceCents: 12000,
    stripeMonthlyPriceEnv: "STRIPE_PRO_MONTHLY_PRICE_ID",
    stripeAnnualPriceEnv: "STRIPE_PRO_ANNUAL_PRICE_ID",
    limits: { aiCredits: 1_000, exports: 1_000, premiumExports: 250, storageBytes: 107_374_182_400, seats: 1, projects: null, premiumTemplates: true, advancedExports: true, teamCollaboration: false },
    features: ["Unlimited projects", "1,000 AI credits/month", "100 GB storage", "Premium templates", "Advanced PNG/PDF/SVG exports"]
  },
  team: {
    id: "team",
    name: "Team",
    description: "Seat-based workspace billing with collaboration, admin controls, and shared quotas.",
    monthlyPriceCents: 3000,
    annualPriceCents: 24000,
    stripeMonthlyPriceEnv: "STRIPE_TEAM_MONTHLY_PRICE_ID",
    stripeAnnualPriceEnv: "STRIPE_TEAM_ANNUAL_PRICE_ID",
    limits: { aiCredits: 5_000, exports: 10_000, premiumExports: 2_500, storageBytes: 1_099_511_627_776, seats: 50, projects: null, premiumTemplates: true, advancedExports: true, teamCollaboration: true },
    features: ["Shared workspaces", "Seat-based billing", "5,000 AI credits/month", "1 TB storage", "Admin controls"]
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "Custom contracts, SSO, governance, marketplace billing, and dedicated limits.",
    monthlyPriceCents: null,
    annualPriceCents: null,
    limits: { aiCredits: 100_000, exports: 1_000_000, premiumExports: 1_000_000, storageBytes: 10_995_116_277_760, seats: 10_000, projects: null, premiumTemplates: true, advancedExports: true, teamCollaboration: true },
    features: ["Custom contracts", "SSO-ready architecture", "Dedicated support", "Custom AI/export quotas", "Future marketplace revenue sharing"]
  }
};

export function getBillingPlan(planId: BillingPlanId): BillingPlan {
  return BILLING_PLANS[planId];
}

export function getPlanOrder(planId: BillingPlanId): number {
  return { free: 0, pro: 1, team: 2, enterprise: 3 }[planId];
}

export function isPlanAtLeast(current: BillingPlanId, required: BillingPlanId): boolean {
  return getPlanOrder(current) >= getPlanOrder(required);
}
