import Stripe from "stripe";
import { getServerEnv } from "@canva-ai/env/server";

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (stripeClient) return stripeClient;
  const env = getServerEnv();
  if (!env.STRIPE_SECRET_KEY || env.STRIPE_SECRET_KEY === "sk_test_local") throw new Error("STRIPE_SECRET_KEY is not configured.");
  stripeClient = new Stripe(env.STRIPE_SECRET_KEY, { appInfo: { name: "Canva AI Billing", version: "0.1.0" } });
  return stripeClient;
}
