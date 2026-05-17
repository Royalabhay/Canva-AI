import { NextResponse, type NextRequest } from "next/server";
import { constructStripeWebhookEvent, handleStripeWebhook } from "@canva-ai/billing/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  try {
    const payload = await request.text();
    const event = constructStripeWebhookEvent(payload, signature);
    const result = await handleStripeWebhook(event);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook handling failed" }, { status: 400 });
  }
}
