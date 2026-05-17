import { getServerEnv } from "@canva-ai/env/server";
import { checkoutRequestSchema, type CheckoutRequest } from "../types";
import { getBillingPlan } from "../plans/catalog";
import { createBillingServiceClient } from "../services/supabase";
import { assertWorkspaceBillingAccess, getOrCreateStripeCustomer } from "../services/repository";
import { getStripeClient } from "./client";

function priceIdFor(request: CheckoutRequest): string {
  const env = getServerEnv() as unknown as Record<string, string>;
  const plan = getBillingPlan(request.planId);
  const envName = request.interval === "year" ? plan.stripeAnnualPriceEnv : plan.stripeMonthlyPriceEnv;
  const priceId = envName ? env[envName] : "";
  if (!priceId) throw new Error(`${request.planId} ${request.interval} Stripe price is not configured.`);
  return priceId;
}

export async function createCheckoutSession(input: unknown, user: { id: string; email?: string | null }) {
  const request = checkoutRequestSchema.parse(input);
  const client = createBillingServiceClient();
  await assertWorkspaceBillingAccess(client, request.workspaceId, user.id, true);
  const stripe = getStripeClient();
  const customer = await getOrCreateStripeCustomer(client, stripe, request.workspaceId, user);
  const env = getServerEnv();
  const successUrl = request.successUrl ?? `${env.NEXT_PUBLIC_APP_URL}/billing?workspaceId=${request.workspaceId}&checkout=success`;
  const cancelUrl = request.cancelUrl ?? `${env.NEXT_PUBLIC_APP_URL}/pricing?workspaceId=${request.workspaceId}&checkout=cancelled`;
  return stripe.checkout.sessions.create({
    mode: "subscription",
    customer,
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: request.workspaceId,
    line_items: [{ price: priceIdFor(request), quantity: request.planId === "team" ? request.seats : 1 }],
    subscription_data: { metadata: { workspaceId: request.workspaceId, userId: user.id, planId: request.planId, seats: String(request.seats) } },
    metadata: { workspaceId: request.workspaceId, userId: user.id, planId: request.planId, interval: request.interval }
  });
}
