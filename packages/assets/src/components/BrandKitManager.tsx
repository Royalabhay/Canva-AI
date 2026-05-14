"use client";
import type { BrandKit } from "@canva-ai/database/types";

export interface BrandColor { id: string; name: string; value: string }
export interface BrandFont { id: string; name: string; family: string; weight?: string | null }

export function BrandKitManager({ kits, colors = [], fonts = [] }: { kits: BrandKit[]; colors?: BrandColor[]; fonts?: BrandFont[] }) {
  return (
    <section className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-3xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold">Brand kits</h2>
        <div className="mt-4 grid gap-2">{kits.map((kit) => <button className="rounded-xl border px-3 py-2 text-left text-sm" key={kit.id}>{kit.name}</button>)}</div>
      </aside>
      <div className="grid gap-6">
        <section className="rounded-3xl border bg-white p-5 shadow-sm"><h3 className="font-bold">Colors</h3><div className="mt-4 flex flex-wrap gap-3">{colors.map((color) => <div className="rounded-xl border p-3" key={color.id}><div className="h-14 w-20 rounded-lg" style={{ background: color.value }} /><p className="mt-2 text-sm font-semibold">{color.name}</p><p className="text-xs text-slate-500">{color.value}</p></div>)}</div></section>
        <section className="rounded-3xl border bg-white p-5 shadow-sm"><h3 className="font-bold">Typography</h3><div className="mt-4 grid gap-3">{fonts.map((font) => <div className="rounded-xl border p-4" key={font.id} style={{ fontFamily: font.family }}><p className="text-xl">{font.name}</p><p className="text-xs text-slate-500">{font.family} {font.weight}</p></div>)}</div></section>
      </div>
    </section>
  );
}
