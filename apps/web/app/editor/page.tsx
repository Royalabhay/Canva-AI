import { EditorShell } from "@canva-ai/editor";
import { getTemplateById } from "@canva-ai/templates";
import { createSupabaseServerClient } from "../../lib/supabase/server";

export default async function EditorPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const designIdParam = params?.designId;
  const templateIdParam = params?.templateId;
  const workspaceIdParam = params?.workspaceId;
  const designId = Array.isArray(designIdParam) ? designIdParam[0] : designIdParam;
  const templateId = Array.isArray(templateIdParam) ? templateIdParam[0] : templateIdParam;
  const workspaceId = Array.isArray(workspaceIdParam) ? workspaceIdParam[0] : workspaceIdParam;
  const db = templateId ? await createSupabaseServerClient() : null;
  const template = templateId && db ? await getTemplateById(db, templateId).catch((error) => {
    console.warn("Template load unavailable", error);
    return null;
  }) : null;
  return <EditorShell autosave={designId ? { designId } : { enabled: false }} initialSnapshot={template?.fabric_json as never} workspaceId={workspaceId} />;
}
