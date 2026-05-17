import { createBillingServiceClient } from "./supabase";
import { assertWorkspaceBillingAccess, getWorkspaceBilling } from "./repository";
import { getUsageDashboard } from "../usage/tracking";
import { BILLING_PLANS } from "../plans/catalog";

export async function getBillingDashboard(workspaceId: string, userId: string) {
  const client = createBillingServiceClient();
  await assertWorkspaceBillingAccess(client, workspaceId, userId, false);
  const billing = await getWorkspaceBilling(client, workspaceId);
  const usage = await getUsageDashboard(workspaceId);
  const { data: invoices, error } = await (client as any).from("invoices").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(24);
  if (error) throw error;
  const { data: subscription } = await (client as any).from("subscriptions").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return { billing, usage, invoices: invoices ?? [], subscription, plans: BILLING_PLANS };
}
