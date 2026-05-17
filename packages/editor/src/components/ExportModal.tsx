"use client";

import { useMemo, useState } from "react";
import type { CanvasSnapshot } from "../types/editor";

type ExportFormat = "png" | "jpg" | "svg" | "pdf" | "mp4";
type ExportState = { status: "idle" | "queued" | "polling" | "completed" | "failed"; message: string; progress: number; downloadUrl?: string };

export function ExportModal({ getSnapshot, onClose, workspaceId }: { getSnapshot: () => CanvasSnapshot | null; onClose: () => void; workspaceId?: string }) {
  const [format, setFormat] = useState<ExportFormat>("png");
  const [quality, setQuality] = useState(92);
  const [scale, setScale] = useState(2);
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [transparentBackground, setTransparentBackground] = useState(true);
  const [workspace, setWorkspace] = useState(workspaceId ?? "");
  const [state, setState] = useState<ExportState>({ status: "idle", message: "Choose export settings", progress: 0 });

  const canExport = useMemo(() => workspace.length > 0 && state.status !== "queued" && state.status !== "polling", [workspace, state.status]);

  async function startExport() {
    const snapshot = getSnapshot();
    if (!snapshot) {
      setState({ status: "failed", message: "Canvas is not ready yet.", progress: 0 });
      return;
    }
    setState({ status: "queued", message: "Queueing export…", progress: 5 });
    const response = await fetch("/api/export/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: workspace,
        pages: [{ id: "page-1", name: "Page 1", fabricJson: snapshot as unknown as Record<string, unknown>, width, height }],
        options: { format, width, height, scale, quality, transparentBackground, filename: `canva-ai-export-${Date.now()}`, embedAssets: true, printDpi: 300 }
      })
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Export request failed" }));
      setState({ status: "failed", message: error.error ?? "Export request failed", progress: 0 });
      return;
    }
    const { jobId } = await response.json() as { jobId: string };
    setState({ status: "polling", message: "Rendering in background…", progress: 10 });
    poll(jobId);
  }

  async function poll(jobId: string) {
    for (;;) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const response = await fetch(`/api/export/jobs/${jobId}`, { cache: "no-store" });
      if (!response.ok) {
        setState((current) => ({ ...current, status: "failed", message: "Unable to read export status" }));
        return;
      }
      const payload = await response.json() as { status?: string; progress?: number; bucket?: string; storage_path?: string; signed_url?: string; public_url?: string; export_jobs?: Array<{ last_error?: string }> };
      const progress = payload.progress ?? 0;
      if (payload.status === "completed") {
        setState({ status: "completed", message: "Export ready to download.", progress: 100, downloadUrl: payload.signed_url ?? payload.public_url });
        return;
      }
      if (payload.status === "failed") {
        setState({ status: "failed", message: payload.export_jobs?.[0]?.last_error ?? "Export failed", progress });
        return;
      }
      setState({ status: "polling", message: payload.status ?? "Rendering…", progress });
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-600">Production export</p>
            <h2 className="text-2xl font-bold text-slate-950">Render and download</h2>
            <p className="text-sm text-slate-500">Exports are rendered asynchronously by the server pipeline.</p>
          </div>
          <button className="rounded-lg px-3 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100" onClick={onClose} type="button">Close</button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-slate-600">Workspace ID<input className="rounded-lg border border-slate-200 p-2 text-slate-950" onChange={(e) => setWorkspace(e.target.value)} placeholder="Workspace UUID" value={workspace} /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-600">Format<select className="rounded-lg border border-slate-200 p-2 text-slate-950" onChange={(e) => setFormat(e.target.value as ExportFormat)} value={format}>{["png", "jpg", "svg", "pdf", "mp4"].map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-600">Width<input className="rounded-lg border border-slate-200 p-2 text-slate-950" min={1} onChange={(e) => setWidth(Number(e.target.value))} type="number" value={width} /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-600">Height<input className="rounded-lg border border-slate-200 p-2 text-slate-950" min={1} onChange={(e) => setHeight(Number(e.target.value))} type="number" value={height} /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-600">Retina scale<input className="rounded-lg border border-slate-200 p-2 text-slate-950" max={8} min={0.1} onChange={(e) => setScale(Number(e.target.value))} step={0.1} type="number" value={scale} /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-600">Quality<input className="rounded-lg border border-slate-200 p-2 text-slate-950" max={100} min={1} onChange={(e) => setQuality(Number(e.target.value))} type="number" value={quality} /></label>
          <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm font-semibold text-slate-600 md:col-span-2"><input checked={transparentBackground} onChange={(e) => setTransparentBackground(e.target.checked)} type="checkbox" /> Transparent background</label>
        </div>

        <div className="mt-5 rounded-xl bg-slate-100 p-4">
          <div className="h-2 overflow-hidden rounded-full bg-white"><div className="h-full bg-cyan-500 transition-all" style={{ width: `${state.progress}%` }} /></div>
          <p className="mt-2 text-sm font-semibold text-slate-700">{state.message}</p>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          {state.downloadUrl ? <a className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-900 hover:bg-slate-50" href={state.downloadUrl}>Download</a> : null}
          <button className="rounded-xl bg-slate-950 px-5 py-2 font-semibold text-white disabled:opacity-50" disabled={!canExport} onClick={startExport} type="button">Start export</button>
        </div>
      </div>
    </div>
  );
}
