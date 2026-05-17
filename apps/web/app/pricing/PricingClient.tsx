"use client";

import { useState } from "react";
import { BILLING_PLANS, type BillingInterval, type BillingPlanId } from "@canva-ai/billing/client";

export function PricingClient({ initialWorkspaceId = "" }: { initialWorkspaceId?: string }) {
  const [workspaceId, setWorkspaceId] = useState(initialWorkspaceId);
  const [interval, setInterval] = useState<BillingInterval>("month");
  const [seats, setSeats] = useState(1);
  const [error, setError] = useState<string | null>(null);

  async function checkout(planId: BillingPlanId) {
    setError(null);
    const response = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId, planId, interval, seats }) });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error ?? "Unable to start checkout");
      return;
    }
    window.location.href = payload.url;
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">Canva AI Pricing</p>
          <h1 className="mt-3 text-5xl font-black tracking-tight">Scale from free designs to enterprise creative operations.</h1>
          <p className="mt-4 text-lg text-slate-300">Real Stripe subscriptions, AI credits, export quotas, storage limits, seat billing, and invoice management.</p>
        </div>
        <div className="mb-8 grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-3">
          <label className="grid gap-2 text-sm font-semibold text-slate-200 md:col-span-2">Workspace ID<input className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white" onChange={(event) => setWorkspaceId(event.target.value)} placeholder="Workspace UUID" value={workspaceId} /></label>
          <label className="grid gap-2 text-sm font-semibold text-slate-200">Team seats<input className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white" min={1} onChange={(event) => setSeats(Number(event.target.value))} type="number" value={seats} /></label>
          <div className="flex gap-2 md:col-span-3">
            <button className={`rounded-xl px-4 py-2 font-bold ${interval === "month" ? "bg-cyan-400 text-slate-950" : "bg-white/10"}`} onClick={() => setInterval("month")} type="button">Monthly</button>
            <button className={`rounded-xl px-4 py-2 font-bold ${interval === "year" ? "bg-cyan-400 text-slate-950" : "bg-white/10"}`} onClick={() => setInterval("year")} type="button">Annual</button>
          </div>
        </div>
        {error ? <div className="mb-6 rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-red-100">{error}</div> : null}
        <div className="grid gap-6 md:grid-cols-4">
          {Object.values(BILLING_PLANS).map((plan) => (
            <section className="flex rounded-3xl border border-white/10 bg-white p-6 text-slate-950 shadow-2xl" key={plan.id}>
              <div className="flex w-full flex-col">
                <h2 className="text-2xl font-black">{plan.name}</h2>
                <p className="mt-2 min-h-20 text-sm text-slate-600">{plan.description}</p>
                <p className="mt-4 text-4xl font-black">{plan.monthlyPriceCents === null ? "Custom" : `$${((interval === "year" ? plan.annualPriceCents ?? 0 : plan.monthlyPriceCents) / 100).toLocaleString()}`}</p>
                <p className="text-sm text-slate-500">{plan.monthlyPriceCents === null ? "Contact sales" : interval === "year" ? "/ year" : "/ month"}</p>
                <ul className="mt-6 grid gap-2 text-sm text-slate-700">{plan.features.map((feature) => <li key={feature}>✓ {feature}</li>)}</ul>
                {plan.id === "free" || plan.id === "enterprise" ? <a className="mt-auto rounded-xl border border-slate-200 px-4 py-3 text-center font-bold" href={plan.id === "free" ? "/dashboard" : "mailto:sales@canva-ai.example"}>{plan.id === "free" ? "Start free" : "Contact sales"}</a> : <button className="mt-auto rounded-xl bg-slate-950 px-4 py-3 font-bold text-white disabled:opacity-50" disabled={!workspaceId} onClick={() => checkout(plan.id)} type="button">Upgrade to {plan.name}</button>}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
