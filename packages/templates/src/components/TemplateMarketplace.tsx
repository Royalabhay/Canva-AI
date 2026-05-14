"use client";
import type { TemplateRecord } from "../services/templateService";
import { TEMPLATE_CATEGORIES } from "../services/templateService";
import { useTemplateStore } from "../store/templateStore";

export function TemplateMarketplace({ templates }: { templates: TemplateRecord[] }) {
  const query = useTemplateStore((state) => state.query);
  const category = useTemplateStore((state) => state.category);
  const setQuery = useTemplateStore((state) => state.setQuery);
  const setCategory = useTemplateStore((state) => state.setCategory);
  const visible = templates.filter((template) => {
    const matchesQuery = !query || template.name.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === "all" || template.category === category;
    return matchesQuery && matchesCategory;
  });

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-3 rounded-3xl border bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <input className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3" placeholder="Search templates" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select className="rounded-xl border border-slate-200 px-4 py-3" value={category} onChange={(event) => setCategory(event.target.value as never)}>
          <option value="all">All categories</option>
          {TEMPLATE_CATEGORIES.map((item) => <option key={item} value={item}>{item.replace("-", " ")}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {visible.map((template) => <TemplateCard key={template.id} template={template} />)}
      </div>
    </section>
  );
}

export function TemplateCard({ template }: { template: TemplateRecord }) {
  const markRecent = useTemplateStore((state) => state.markRecent);
  const toggleFavorite = useTemplateStore((state) => state.toggleFavorite);
  const isFavorite = useTemplateStore((state) => state.favorites.has(template.id));
  return (
    <article className="group overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl">
      <a href={`/editor?templateId=${template.id}`} onClick={() => markRecent(template)} className="block">
        <div className="aspect-[4/3] bg-slate-100">
          {template.thumbnail_url || template.preview_url ? <img className="h-full w-full object-cover" loading="lazy" src={template.thumbnail_url ?? template.preview_url ?? ""} alt={template.name} /> : <div className="grid h-full place-items-center text-sm text-slate-400">No preview</div>}
        </div>
      </a>
      <div className="grid gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-slate-950">{template.name}</h3>
            <p className="text-xs uppercase tracking-wide text-slate-500">{template.category ?? "template"}</p>
          </div>
          <button className="rounded-full border px-3 py-1 text-xs" onClick={() => toggleFavorite(template.id)} type="button">{isFavorite ? "Saved" : "Save"}</button>
        </div>
        <div className="flex gap-2 text-xs text-slate-500">
          {template.is_featured ? <span>Featured</span> : null}
          {template.is_premium ? <span>Premium</span> : null}
          <span>v{template.version ?? 1}</span>
        </div>
      </div>
    </article>
  );
}
