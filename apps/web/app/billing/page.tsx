import { getBillingDashboard } from "@canva-ai/billing/server";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import { BillingActions } from "./BillingActions";

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(1)} ${units[index]}`;
}

export default async function BillingPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const workspaceIdParam = params?.workspaceId;
  const workspaceId = Array.isArray(workspaceIdParam) ? workspaceIdParam[0] : workspaceIdParam;
  const db = await createSupabaseServerClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return <main className="p-8"><h1 className="text-2xl font-bold">Sign in to manage billing</h1></main>;
  if (!workspaceId) return <main className="p-8"><h1 className="text-2xl font-bold">Select a workspace</h1><p className="text-slate-500">Pass <code>?workspaceId=...</code> to view billing.</p></main>;
  const dashboard = await getBillingDashboard(workspaceId, user.id);
  const plan = dashboard.plans[dashboard.billing.plan_id as keyof typeof dashboard.plans] ?? dashboard.plans.free;
  const credits = dashboard.usage.credits;
  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-950">
      <div className="mx-auto grid max-w-6xl gap-6">
        <header className="rounded-3xl bg-slate-950 p-8 text-white"><p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">Billing dashboard</p><h1 className="mt-2 text-4xl font-black">{plan.name} plan</h1><p className="mt-2 text-slate-300">Status: {dashboard.billing.billing_status ?? "active"} · Seats: {dashboard.billing.seat_count ?? 1}</p></header>
        <div className="grid gap-6 md:grid-cols-3">
          <section className="rounded-2xl bg-white p-6 shadow"><h2 className="font-bold">AI credits</h2><p className="mt-3 text-3xl font-black">{Number(credits?.credits_used ?? 0)} / {Number(credits?.credits_granted ?? plan.limits.aiCredits)}</p></section>
          <section className="rounded-2xl bg-white p-6 shadow"><h2 className="font-bold">Export quota</h2><p className="mt-3 text-3xl font-black">{dashboard.usage.quotaUsage.find((item: any) => item.metric === "export")?.used ?? 0} / {plan.limits.exports}</p></section>
          <section className="rounded-2xl bg-white p-6 shadow"><h2 className="font-bold">Storage limit</h2><p className="mt-3 text-3xl font-black">{formatBytes(plan.limits.storageBytes)}</p></section>
        </div>
        <section className="rounded-2xl bg-white p-6 shadow"><h2 className="mb-4 text-xl font-black">Subscription management</h2><BillingActions workspaceId={workspaceId} /></section>
        <section className="rounded-2xl bg-white p-6 shadow"><h2 className="mb-4 text-xl font-black">Usage dashboard</h2><div className="grid gap-2">{dashboard.usage.quotaUsage.map((item: any) => <div className="flex justify-between rounded-xl bg-slate-50 p-3" key={item.metric}><span>{item.metric}</span><strong>{item.used}</strong></div>)}</div></section>
        <section className="rounded-2xl bg-white p-6 shadow"><h2 className="mb-4 text-xl font-black">Invoice history</h2><div className="overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th className="py-2">Invoice</th><th>Status</th><th>Amount</th><th>Period</th><th>PDF</th></tr></thead><tbody>{dashboard.invoices.map((invoice: any) => <tr className="border-t" key={invoice.id}><td className="py-2">{invoice.number ?? invoice.stripe_invoice_id}</td><td>{invoice.status}</td><td>{(Number(invoice.amount_due ?? 0) / 100).toLocaleString(undefined, { style: "currency", currency: invoice.currency ?? "USD" })}</td><td>{invoice.period_start?.slice(0, 10)} – {invoice.period_end?.slice(0, 10)}</td><td>{invoice.invoice_pdf ? <a className="text-cyan-600" href={invoice.invoice_pdf}>Download</a> : "—"}</td></tr>)}</tbody></table></div></section>
      </div>
    </main>
  );
}
