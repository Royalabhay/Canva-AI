import { TemplateMarketplace, searchTemplates } from "@canva-ai/templates";
import { createSupabaseServerClient } from "../../lib/supabase/server";

export default async function TemplatesPage() {
  const db = await createSupabaseServerClient();
  const templates = await searchTemplates(db, { visibility: "all", limit: 80 }).catch((error) => {
    console.warn("Template marketplace unavailable", error);
    return [];
  });
  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto grid max-w-7xl gap-8">
        <header><p className="text-sm font-semibold text-cyan-600">Marketplace</p><h1 className="text-4xl font-bold">Templates</h1><p className="mt-2 text-slate-600">Browse public and workspace templates, then open one directly in the editor.</p></header>
        <TemplateMarketplace templates={templates} />
      </div>
    </main>
  );
}
