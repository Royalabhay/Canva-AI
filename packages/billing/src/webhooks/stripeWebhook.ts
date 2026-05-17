import Stripe from "stripe";
import { getServerEnv } from "@canva-ai/env/server";
import { getStripeClient } from "../stripe/client";
import { createBillingServiceClient } from "../services/supabase";
import { recordBillingEvent, recordInvoice, recordPayment, upsertSubscriptionFromStripe } from "../services/repository";

export function constructStripeWebhookEvent(payload: string | Buffer, signature: string): Stripe.Event {
  const env = getServerEnv();
  return getStripeClient().webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
}

export async function handleStripeWebhook(event: Stripe.Event): Promise<{ processed: boolean; type: string }> {
  const client = createBillingServiceClient();
  const firstSeen = await recordBillingEvent(client, event);
  if (!firstSeen) return { processed: false, type: event.type };

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.subscription) {
        const subscription = await getStripeClient().subscriptions.retrieve(String(session.subscription));
        await upsertSubscriptionFromStripe(client, subscription);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await upsertSubscriptionFromStripe(client, event.data.object as Stripe.Subscription);
      break;
    case "invoice.created":
    case "invoice.finalized":
    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      await recordInvoice(client, invoice);
      if (event.type === "invoice.paid") await recordPayment(client, invoice, "succeeded");
      if (event.type === "invoice.payment_failed") await recordPayment(client, invoice, "failed");
      break;
    }
    default:
      break;
  }
  return { processed: true, type: event.type };
}
