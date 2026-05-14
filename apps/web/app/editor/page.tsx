import { EditorShell } from "@canva-ai/editor";

export default async function EditorPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const designIdParam = params?.designId;
  const designId = Array.isArray(designIdParam) ? designIdParam[0] : designIdParam;
  return <EditorShell autosave={designId ? { designId } : { enabled: false }} />;
}
