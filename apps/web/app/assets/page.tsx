import { AssetBrowser, searchAssets } from "@canva-ai/assets";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import { requireUser } from "../../server/auth";

export default async function AssetsPage() {
  const user = await requireUser();
  const db = await createSupabaseServerClient();
  const { data: membership } = await (db.from("workspace_members") as any).select("workspace_id").eq("user_id", user.id).is("deleted_at", null).limit(1).single();
  const workspaceId = membership?.workspace_id as string | undefined;
  const assets = workspaceId ? await searchAssets(db, { workspaceId, limit: 100 }) : [];
  const signedUrls: Record<string, string> = {};
  for (const asset of assets) {
    const { data } = await db.storage.from(asset.bucket).createSignedUrl(asset.path, 3600);
    if (data?.signedUrl) signedUrls[asset.id] = data.signedUrl;
  }
  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto grid max-w-7xl gap-8">
        <header><p className="text-sm font-semibold text-cyan-600">Workspace library</p><h1 className="text-4xl font-bold">Assets</h1><p className="mt-2 text-slate-600">Drag images into the editor canvas or manage your media library.</p></header>
        <AssetBrowser assets={assets} signedUrls={signedUrls} />
      </div>
    </main>
  );
}
