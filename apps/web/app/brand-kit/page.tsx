import { BrandKitManager, type BrandColor, type BrandFont } from "@canva-ai/assets";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import { requireUser } from "../../server/auth";

export default async function BrandKitPage() {
  const user = await requireUser();
  const db = await createSupabaseServerClient();
  const { data: membership } = await (db.from("workspace_members") as any).select("workspace_id").eq("user_id", user.id).is("deleted_at", null).limit(1).single();
  const workspaceId = membership?.workspace_id as string | undefined;
  const { data: kits } = workspaceId ? await (db.from("brand_kits") as any).select("*").eq("workspace_id", workspaceId).is("deleted_at", null) : { data: [] };
  const { data: colors } = workspaceId ? await (db.from("brand_colors") as any).select("*").eq("workspace_id", workspaceId).is("deleted_at", null) : { data: [] };
  const { data: fonts } = workspaceId ? await (db.from("brand_fonts") as any).select("*").eq("workspace_id", workspaceId).is("deleted_at", null) : { data: [] };
  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto grid max-w-7xl gap-8">
        <header><p className="text-sm font-semibold text-cyan-600">Brand governance</p><h1 className="text-4xl font-bold">Brand kit</h1><p className="mt-2 text-slate-600">Manage reusable colors, typography, and logo assets for your workspace.</p></header>
        <BrandKitManager kits={kits ?? []} colors={(colors ?? []) as BrandColor[]} fonts={(fonts ?? []) as BrandFont[]} />
      </div>
    </main>
  );
}
