"use client";

import { useState } from "react";

export function BillingActions({ workspaceId }: { workspaceId: string }) {
  const [error, setError] = useState<string | null>(null);
  async function openPortal() {
    setError(null);
    const response = await fetch("/api/billing/portal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId }) });
    const payload = await response.json();
    if (!response.ok) return setError(payload.error ?? "Unable to open portal");
    window.location.href = payload.url;
  }
  return <div className="grid gap-3"><button className="rounded-xl bg-cyan-500 px-4 py-3 font-bold text-slate-950" onClick={openPortal} type="button">Open Stripe billing portal</button>{error ? <p className="text-sm text-red-600">{error}</p> : null}</div>;
}
