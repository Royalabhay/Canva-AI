import type { DbClient } from "@canva-ai/database";
import type { Json } from "@canva-ai/database/types";

export const TEMPLATE_CATEGORIES = ["social-media", "presentations", "posters", "resumes", "business", "marketing", "ecommerce", "video"] as const;
export type TemplateCategorySlug = typeof TEMPLATE_CATEGORIES[number];
export type TemplateVisibility = "private" | "workspace" | "public";
export type TemplateStatus = "draft" | "review" | "published" | "archived";

export interface TemplateRecord {
  id: string;
  workspace_id: string | null;
  owner_id: string | null;
  name: string;
  category: string | null;
  category_id?: string | null;
  fabric_json: Json;
  thumbnail_url: string | null;
  preview_url?: string | null;
  is_public: boolean;
  visibility?: TemplateVisibility;
  status?: TemplateStatus;
  is_featured?: boolean;
  is_premium?: boolean;
  version?: number;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface TemplateSearchInput {
  workspaceId?: string;
  query?: string;
  category?: TemplateCategorySlug | "all";
  visibility?: TemplateVisibility | "all";
  featured?: boolean;
  premium?: boolean;
  limit?: number;
  cursor?: string;
}

export interface CreateTemplateInput {
  workspaceId: string;
  ownerId: string;
  name: string;
  category: TemplateCategorySlug;
  fabricJson: Json;
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  visibility?: TemplateVisibility;
  metadata?: Record<string, unknown>;
}

export function normalizeTemplateQuery(input: TemplateSearchInput) {
  return {
    ...input,
    limit: Math.min(Math.max(input.limit ?? 30, 1), 100),
    query: input.query?.trim() ?? ""
  };
}

export async function searchTemplates(db: DbClient, input: TemplateSearchInput = {}): Promise<TemplateRecord[]> {
  const payload = normalizeTemplateQuery(input);
  let query = (db.from("templates") as any)
    .select("*")
    .is("deleted_at", null)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(payload.limit);

  if (payload.workspaceId) query = query.or(`visibility.eq.public,workspace_id.eq.${payload.workspaceId}`);
  else query = query.or("visibility.eq.public,is_public.eq.true");
  if (payload.category && payload.category !== "all") query = query.eq("category", payload.category);
  if (payload.visibility && payload.visibility !== "all") query = query.eq("visibility", payload.visibility);
  if (payload.featured !== undefined) query = query.eq("is_featured", payload.featured);
  if (payload.premium !== undefined) query = query.eq("is_premium", payload.premium);
  if (payload.query) query = query.ilike("name", `%${payload.query}%`);
  if (payload.cursor) query = query.lt("created_at", payload.cursor);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as TemplateRecord[];
}

export async function getTemplateById(db: DbClient, templateId: string): Promise<TemplateRecord | null> {
  const { data, error } = await (db.from("templates") as any).select("*").eq("id", templateId).is("deleted_at", null).single();
  if (error?.code === "PGRST116") return null;
  if (error) throw error;
  return data as TemplateRecord;
}

export async function createTemplate(db: DbClient, input: CreateTemplateInput): Promise<TemplateRecord> {
  const { data, error } = await (db.from("templates") as any).insert({
    workspace_id: input.workspaceId,
    owner_id: input.ownerId,
    name: input.name,
    category: input.category,
    fabric_json: input.fabricJson,
    thumbnail_url: input.thumbnailUrl ?? null,
    preview_url: input.previewUrl ?? input.thumbnailUrl ?? null,
    is_public: input.visibility === "public",
    visibility: input.visibility ?? "workspace",
    status: input.visibility === "public" ? "published" : "draft",
    metadata: input.metadata ?? {}
  }).select("*").single();
  if (error) throw error;
  const template = data as TemplateRecord;
  await createTemplateVersion(db, template, input.ownerId);
  return template;
}

export async function createTemplateVersion(db: DbClient, template: TemplateRecord, userId: string | null): Promise<void> {
  await (db.from("template_versions") as any).insert({
    template_id: template.id,
    workspace_id: template.workspace_id,
    version: template.version ?? 1,
    fabric_json: template.fabric_json,
    thumbnail_url: template.thumbnail_url,
    preview_url: template.preview_url ?? template.thumbnail_url,
    created_by: userId,
    metadata: template.metadata ?? {}
  });
}

export async function publishTemplate(db: DbClient, templateId: string): Promise<TemplateRecord> {
  const { data, error } = await (db.from("templates") as any).update({ visibility: "public", status: "published", is_public: true }).eq("id", templateId).select("*").single();
  if (error) throw error;
  return data as TemplateRecord;
}

export async function duplicateTemplate(db: DbClient, templateId: string, workspaceId: string, userId: string): Promise<TemplateRecord> {
  const source = await getTemplateById(db, templateId);
  if (!source) throw new Error("Template not found");
  return createTemplate(db, {
    workspaceId,
    ownerId: userId,
    name: `${source.name} Copy`,
    category: (source.category as TemplateCategorySlug) ?? "business",
    fabricJson: source.fabric_json,
    thumbnailUrl: source.thumbnail_url,
    previewUrl: source.preview_url ?? source.thumbnail_url,
    visibility: "workspace",
    metadata: { sourceTemplateId: source.id, duplicatedAt: new Date().toISOString() }
  });
}

export function exportTemplate(template: TemplateRecord): string {
  return JSON.stringify({
    schema: "canva-ai/template@1",
    id: template.id,
    name: template.name,
    category: template.category,
    fabricJson: template.fabric_json,
    metadata: template.metadata,
    exportedAt: new Date().toISOString()
  }, null, 2);
}
