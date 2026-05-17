"use client";

import { useState } from "react";
import type { CanvasSnapshot, EditorActions } from "../types/editor";

interface AIAssistantPanelProps { actions: EditorActions }

export function AIAssistantPanel({ actions }: AIAssistantPanelProps) {
  const [prompt, setPrompt] = useState("Generate a modern Instagram post for a coffee brand");
  const [status, setStatus] = useState<"idle" | "generating" | "resizing" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function generateDesign() {
    setStatus("generating");
    setError(null);
    const response = await fetch("/api/ai/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, target: "instagram-post", mode: "marketing" }) });
    const result = await response.json() as { ok: boolean; data?: { fabricJson?: CanvasSnapshot }; error?: string };
    if (!response.ok || !result.ok || !result.data?.fabricJson) {
      setError(result.error ?? "AI generation failed");
      setStatus("error");
      return;
    }
    await actions.deserialize(result.data.fabricJson);
    setStatus("idle");
  }

  async function resizeForStory() {
    const source = actions.serialize();
    if (!source) return;
    setStatus("resizing");
    setError(null);
    const response = await fetch("/api/ai/resize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source, target: "instagram-story" }) });
    const result = await response.json() as { ok: boolean; data?: CanvasSnapshot; error?: string };
    if (!response.ok || !result.ok || !result.data) {
      setError(result.error ?? "AI resize failed");
      setStatus("error");
      return;
    }
    await actions.deserialize(result.data);
    setStatus("idle");
  }

  return (
    <section className="border-b border-slate-200 p-4">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">AI design</h2>
      <div className="grid gap-3">
        <textarea className="min-h-24 rounded-xl border border-slate-200 p-3 text-sm" value={prompt} onChange={(event) => setPrompt(event.target.value)} />
        <button className="rounded-xl bg-cyan-500 px-4 py-3 text-sm font-bold text-white disabled:opacity-50" disabled={status === "generating"} onClick={generateDesign} type="button">{status === "generating" ? "Generating..." : "Generate design"}</button>
        <button className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold" disabled={status === "resizing"} onClick={resizeForStory} type="button">Smart resize to Story</button>
        {error ? <p className="rounded-xl bg-red-50 p-3 text-xs text-red-600">{error}</p> : null}
      </div>
    </section>
  );
}
