"use client";
import type { Asset } from "@canva-ai/database/types";
import { useAssetStore } from "../store/assetStore";

export function AssetBrowser({ assets, signedUrls = {} }: { assets: Asset[]; signedUrls?: Record<string, string> }) {
  const query = useAssetStore((state) => state.query);
  const kind = useAssetStore((state) => state.kind);
  const setQuery = useAssetStore((state) => state.setQuery);
  const setKind = useAssetStore((state) => state.setKind);
  const filtered = assets.filter((asset) => (!query || asset.filename.toLowerCase().includes(query.toLowerCase())) && (kind === "all" || asset.kind === kind));
  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-3 rounded-3xl border bg-white p-5 shadow-sm md:flex-row">
        <input className="min-w-0 flex-1 rounded-xl border px-4 py-3" placeholder="Search assets" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select className="rounded-xl border px-4 py-3" value={kind} onChange={(event) => setKind(event.target.value)}>
          <option value="all">All assets</option><option value="image">Images</option><option value="video">Videos</option><option value="font">Fonts</option><option value="document">Documents</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
        {filtered.map((asset) => <AssetCard key={asset.id} asset={asset} url={signedUrls[asset.id] ?? asset.public_url ?? asset.cdn_url ?? ""} />)}
      </div>
    </section>
  );
}

export function AssetCard({ asset, url }: { asset: Asset; url: string }) {
  return (
    <article className="rounded-2xl border bg-white p-3 shadow-sm" draggable={Boolean(url)} onDragStart={(event) => {
      event.dataTransfer.setData("application/x-canva-asset-url", url);
      event.dataTransfer.setData("text/uri-list", url);
      event.dataTransfer.effectAllowed = "copy";
    }}>
      <div className="aspect-square overflow-hidden rounded-xl bg-slate-100">
        {asset.kind === "image" && url ? <img className="h-full w-full object-cover" loading="lazy" src={url} alt={asset.filename} /> : <div className="grid h-full place-items-center text-xs uppercase text-slate-500">{asset.kind}</div>}
      </div>
      <p className="mt-2 truncate text-sm font-semibold">{asset.filename}</p>
      <p className="text-xs text-slate-500">{asset.tags.join(", ") || "No tags"}</p>
    </article>
  );
}
