import type Stripe from "stripe";
import type { BillingPlanId, UsageMetric } from "../types";
import { getBillingPlan } from "../plans/catalog";
import type { BillingSupabaseClient } from "./supabase";

const PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

export function currentPeriod(now = new Date()) {
  return { start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)) };
}

export async function assertWorkspaceBillingAccess(client: BillingSupabaseClient, workspaceId: string, userId: string, adminOnly = false): Promise<void> {
  const { data, error } = await (client as any).from("workspace_members").select("role").eq("workspace_id", workspaceId).eq("user_id", userId).is("deleted_at", null).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("You do not have access to this workspace billing account.");
  if (adminOnly && !["owner", "admin"].includes(data.role)) throw new Error("Workspace admin permissions are required for billing changes.");
}

export async function getWorkspaceBilling(client: BillingSupabaseClient, workspaceId: string) {
  const { data, error } = await (client as any).from("workspace_billing").select("*").eq("workspace_id", workspaceId).maybeSingle();
  if (error) throw error;
  if (data) return data as any;
  const { data: inserted, error: insertError } = await (client as any).from("workspace_billing").insert({ workspace_id: workspaceId, plan_id: "free", billing_status: "active" }).select("*").single();
  if (insertError) throw insertError;
  return inserted as any;
}

export async function getWorkspacePlanId(client: BillingSupabaseClient, workspaceId: string): Promise<BillingPlanId> {
  const billing = await getWorkspaceBilling(client, workspaceId);
  return (billing.plan_id ?? "free") as BillingPlanId;
}

export async function getOrCreateStripeCustomer(client: BillingSupabaseClient, stripe: Stripe, workspaceId: string, user: { id: string; email?: string | null }): Promise<string> {
  const billing = await getWorkspaceBilling(client, workspaceId);
  if (billing.stripe_customer_id) return billing.stripe_customer_id;
  const customer = await stripe.customers.create({ email: user.email ?? undefined, metadata: { workspaceId, userId: user.id } });
  const { error } = await (client as any).from("workspace_billing").update({ stripe_customer_id: customer.id, billing_email: user.email ?? null }).eq("workspace_id", workspaceId);
  if (error) throw error;
  return customer.id;
}

export async function upsertSubscriptionFromStripe(client: BillingSupabaseClient, subscription: Stripe.Subscription): Promise<void> {
  const workspaceId = subscription.metadata.workspaceId;
  const planId = (subscription.metadata.planId || "free") as BillingPlanId;
  if (!workspaceId) return;
  const item = subscription.items.data[0];
  const quantity = item?.quantity ?? Number(subscription.metadata.seats ?? 1);
  const periodStart = new Date(((subscription as any).current_period_start ?? Math.floor(Date.now() / 1000)) * 1000).toISOString();
  const periodEnd = new Date(((subscription as any).current_period_end ?? Math.floor((Date.now() + PERIOD_MS) / 1000)) * 1000).toISOString();
  const { error: billingError } = await (client as any).from("workspace_billing").upsert({ workspace_id: workspaceId, plan_id: planId, billing_status: subscription.status, stripe_customer_id: String(subscription.customer), stripe_subscription_id: subscription.id, seat_count: quantity, current_period_start: periodStart, current_period_end: periodEnd }, { onConflict: "workspace_id" });
  if (billingError) throw billingError;
  const { error: subError } = await (client as any).from("subscriptions").upsert({ workspace_id: workspaceId, stripe_customer_id: String(subscription.customer), stripe_subscription_id: subscription.id, status: subscription.status, plan_id: planId, interval: (item?.price.recurring?.interval ?? "month"), quantity, current_period_start: periodStart, current_period_end: periodEnd, cancel_at_period_end: subscription.cancel_at_period_end, metadata: subscription.metadata }, { onConflict: "stripe_subscription_id" });
  if (subError) throw subError;
  if (item) {
    const { error } = await (client as any).from("subscription_items").upsert({ subscription_id: subscription.id, stripe_subscription_item_id: item.id, stripe_price_id: item.price.id, quantity, metadata: item.metadata ?? {} }, { onConflict: "stripe_subscription_item_id" });
    if (error) throw error;
  }
  await ensureMonthlyCredits(client, workspaceId, planId);
}

export async function recordBillingEvent(client: BillingSupabaseClient, event: Stripe.Event): Promise<boolean> {
  const { data, error } = await (client as any).from("billing_events").insert({ stripe_event_id: event.id, event_type: event.type, payload: event as any, processed_at: new Date().toISOString() }).select("id").maybeSingle();
  if (error) {
    if (String(error.message).includes("duplicate") || String(error.code) === "23505") return false;
    throw error;
  }
  return Boolean(data);
}

export async function recordInvoice(client: BillingSupabaseClient, invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = typeof (invoice as any).subscription === "string" ? (invoice as any).subscription : (invoice as any).subscription?.id;
  const workspaceId = invoice.metadata?.workspaceId ?? null;
  const { error } = await (client as any).from("invoices").upsert({ stripe_invoice_id: invoice.id, stripe_customer_id: String(invoice.customer ?? ""), stripe_subscription_id: subscriptionId ?? null, workspace_id: workspaceId, status: invoice.status, number: invoice.number, currency: invoice.currency, amount_due: invoice.amount_due, amount_paid: invoice.amount_paid, hosted_invoice_url: invoice.hosted_invoice_url, invoice_pdf: invoice.invoice_pdf, period_start: new Date((invoice.period_start ?? 0) * 1000).toISOString(), period_end: new Date((invoice.period_end ?? 0) * 1000).toISOString(), metadata: invoice.metadata ?? {} }, { onConflict: "stripe_invoice_id" });
  if (error) throw error;
}

export async function recordPayment(client: BillingSupabaseClient, invoice: Stripe.Invoice, status: "succeeded" | "failed"): Promise<void> {
  const { error } = await (client as any).from("payment_history").insert({ stripe_invoice_id: invoice.id, stripe_customer_id: String(invoice.customer ?? ""), status, amount: status === "succeeded" ? invoice.amount_paid : invoice.amount_due, currency: invoice.currency, paid_at: status === "succeeded" ? new Date().toISOString() : null, failure_reason: status === "failed" ? "invoice.payment_failed" : null, metadata: invoice.metadata ?? {} });
  if (error) throw error;
}

export async function ensureMonthlyCredits(client: BillingSupabaseClient, workspaceId: string, planId?: BillingPlanId): Promise<void> {
  const resolved = planId ?? await getWorkspacePlanId(client, workspaceId);
  const plan = getBillingPlan(resolved);
  const period = currentPeriod();
  const { error } = await (client as any).from("ai_credits").upsert({ workspace_id: workspaceId, period_start: period.start.toISOString(), period_end: period.end.toISOString(), credits_granted: plan.limits.aiCredits, credits_used: 0, overage_credits: 0 }, { onConflict: "workspace_id,period_start" });
  if (error) throw error;
}

export async function getMetricUsage(client: BillingSupabaseClient, workspaceId: string, metric: UsageMetric): Promise<number> {
  const period = currentPeriod();
  const { data, error } = await (client as any).from("quota_usage").select("used").eq("workspace_id", workspaceId).eq("metric", metric).eq("period_start", period.start.toISOString()).maybeSingle();
  if (error) throw error;
  return Number(data?.used ?? 0);
}

export async function incrementUsage(client: BillingSupabaseClient, workspaceId: string, metric: UsageMetric, amount: number, userId?: string, metadata: Record<string, unknown> = {}): Promise<number> {
  const period = currentPeriod();
  const { data, error } = await (client as any).rpc("increment_quota_usage", { target_workspace_id: workspaceId, target_metric: metric, increment_by: amount, period_start_at: period.start.toISOString(), period_end_at: period.end.toISOString() });
  if (error) throw error;
  const { error: usageError } = await (client as any).from("usage_tracking").insert({ workspace_id: workspaceId, user_id: userId ?? null, metric, quantity: amount, metadata });
  if (usageError) throw usageError;
  return Number(data ?? 0);
}
