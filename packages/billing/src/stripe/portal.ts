import { getServerEnv } from "@canva-ai/env/server";
import { portalRequestSchema } from "../types";
import { createBillingServiceClient } from "../services/supabase";
import { assertWorkspaceBillingAccess, getWorkspaceBilling } from "../services/repository";
import { getStripeClient } from "./client";

export async function createBillingPortalSession(input: unknown, userId: string) {
  const request = portalRequestSchema.parse(input);
  const client = createBillingServiceClient();
  await assertWorkspaceBillingAccess(client, request.workspaceId, userId, true);
  const billing = await getWorkspaceBilling(client, request.workspaceId);
  if (!billing.stripe_customer_id) throw new Error("This workspace does not have a Stripe customer yet.");
  const env = getServerEnv();
  return getStripeClient().billingPortal.sessions.create({ customer: billing.stripe_customer_id, return_url: request.returnUrl ?? `${env.NEXT_PUBLIC_APP_URL}/billing?workspaceId=${request.workspaceId}` });
}
