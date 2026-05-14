import type { DbClient } from "../client";
import type { Design, Json, Project } from "../types/database";
import { assertResult } from "./errors";
import { autosaveDesignSchema, createProjectSchema, updateProjectSchema, type AutosaveDesignInput, type CreateProjectInput, type UpdateProjectInput } from "../schema/validation";

function slugify(value: string): string {
  const slug = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${slug || "project"}-${Date.now().toString(36)}`;
}

export async function createProject(db: DbClient, userId: string, input: CreateProjectInput): Promise<{ project: Project; design: Design }> {
  const payload = createProjectSchema.parse(input);
  const { data: projectData, error: projectError } = await (db.from("projects") as any).insert({
    workspace_id: payload.workspaceId,
    owner_id: userId,
    name: payload.name,
    slug: slugify(payload.name),
    description: payload.description ?? null,
    metadata: (payload.metadata ?? {}) as Json
  }).select("*").single();
  const project = assertResult(projectData, projectError);

  const { data: designData, error: designError } = await (db.from("designs") as any).insert({
    project_id: project.id,
    workspace_id: project.workspace_id,
    owner_id: userId,
    name: `${payload.name} Design`,
    fabric_json: { version: "6", objects: [] },
    width: 1920,
    height: 1080,
    metadata: {}
  }).select("*").single();

  return { project, design: assertResult(designData, designError) };
}

export async function updateProject(db: DbClient, input: UpdateProjectInput): Promise<Project> {
  const payload = updateProjectSchema.parse(input);
  const { data, error } = await (db.from("projects") as any).update({
    name: payload.name,
    description: payload.description,
    thumbnail_url: payload.thumbnailUrl,
    metadata: payload.metadata as Json | undefined,
    updated_at: new Date().toISOString()
  }).eq("id", payload.projectId).is("deleted_at", null).select("*").single();
  return assertResult(data, error);
}

export async function deleteProject(db: DbClient, projectId: string): Promise<Project> {
  const { data, error } = await (db.from("projects") as any).update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", projectId).select("*").single();
  return assertResult(data, error);
}

export async function duplicateProject(db: DbClient, userId: string, projectId: string): Promise<{ project: Project; design: Design | null }> {
  const { data: source, error: sourceError } = await (db.from("projects") as any).select("*, designs(*)").eq("id", projectId).is("deleted_at", null).single();
  const project = assertResult(source as unknown as (Project & { designs?: Design[] }), sourceError);
  const { data: copiedProject, error: copyError } = await (db.from("projects") as any).insert({
    workspace_id: project.workspace_id,
    owner_id: userId,
    name: `${project.name} Copy`,
    slug: slugify(`${project.name} copy`),
    description: project.description,
    thumbnail_url: project.thumbnail_url,
    metadata: project.metadata
  }).select("*").single();
  const nextProject = assertResult(copiedProject, copyError);
  const firstDesign = project.designs?.[0];
  if (!firstDesign) return { project: nextProject, design: null };
  const { data: copiedDesign, error: designError } = await (db.from("designs") as any).insert({
    project_id: nextProject.id,
    workspace_id: nextProject.workspace_id,
    owner_id: userId,
    name: firstDesign.name,
    fabric_json: firstDesign.fabric_json,
    width: firstDesign.width,
    height: firstDesign.height,
    thumbnail_url: firstDesign.thumbnail_url,
    metadata: firstDesign.metadata
  }).select("*").single();
  return { project: nextProject, design: assertResult(copiedDesign, designError) };
}

export async function autosaveDesign(db: DbClient, input: AutosaveDesignInput): Promise<Design> {
  const payload = autosaveDesignSchema.parse(input);
  const now = new Date().toISOString();
  const { data, error } = await (db.from("designs") as any).update({
    fabric_json: payload.fabricJson as Json,
    thumbnail_url: payload.thumbnailUrl,
    metadata: payload.metadata as Json | undefined,
    width: payload.width,
    height: payload.height,
    autosaved_at: now,
    updated_at: now,
    version: undefined
  }).eq("id", payload.designId).is("deleted_at", null).select("*").single();
  const design = assertResult(data, error);

  await (db.from("design_versions") as any).insert({
    design_id: design.id,
    workspace_id: design.workspace_id,
    version: design.version,
    fabric_json: design.fabric_json,
    thumbnail_url: design.thumbnail_url,
    created_by: design.owner_id,
    metadata: design.metadata
  });

  return design;
}

export async function listWorkspaceProjects(db: DbClient, workspaceId: string): Promise<Project[]> {
  const { data, error } = await (db.from("projects") as any).select("*").eq("workspace_id", workspaceId).is("deleted_at", null).order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
