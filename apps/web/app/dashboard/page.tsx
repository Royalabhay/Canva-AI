import Link from "next/link";
import { listWorkspaceProjects } from "@canva-ai/database";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import { requireUser } from "../../server/auth";

export default async function DashboardPage() {
  const user = await requireUser();
  const db = await createSupabaseServerClient();
  const { data: memberships } = await db.from("workspace_members").select("workspace_id, workspaces(*)").eq("user_id", user.id).is("deleted_at", null).limit(1);
  const workspaceId = (memberships as Array<{ workspace_id: string }> | null)?.[0]?.workspace_id;
  const projects = workspaceId ? await listWorkspaceProjects(db, workspaceId) : [];

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-cyan-600">Dashboard</p>
            <h1 className="text-3xl font-bold">Projects</h1>
          </div>
          <Link href="/editor" className="rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white">New design</Link>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {projects.map((project) => <Link className="rounded-2xl border bg-white p-5 shadow-sm" href={`/editor?projectId=${project.id}`} key={project.id}>{project.name}</Link>)}
        </div>
      </div>
    </main>
  );
}
