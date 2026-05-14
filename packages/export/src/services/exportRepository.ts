import type { ExportSupabaseClient } from "./supabaseStorage";
import type { ExportJobData, ExportRequest, ExportResult, ExportStatus, RenderedArtifact } from "../types";

type Db = ExportSupabaseClient;

export async function assertWorkspaceExportAccess(client: Db, workspaceId: string, userId: string): Promise<void> {
  const { data, error } = await client.from("workspace_members").select("id, role").eq("workspace_id", workspaceId).eq("user_id", userId).is("deleted_at", null).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("You do not have access to export from this workspace.");
}

export async function createExportRecords(client: Db, request: ExportRequest): Promise<{ exportId: string; jobId: string }> {
  const { data: exportRow, error: exportError } = await client.from("exports").insert({
    workspace_id: request.workspaceId,
    project_id: request.projectId ?? null,
    design_id: request.designId ?? null,
    template_id: request.templateId ?? null,
    requested_by: request.requestedBy,
    format: request.options.format,
    status: "queued",
    options: request.options,
    page_count: request.pages.length,
    progress: 0
  } as never).select("id").single();
  if (exportError) throw exportError;
  const exportId = (exportRow as { id: string }).id;
  const { data: jobRow, error: jobError } = await client.from("export_jobs").insert({ export_id: exportId, workspace_id: request.workspaceId, status: "queued", priority: 5, attempts: 0, progress: 0, payload: request } as never).select("id").single();
  if (jobError) throw jobError;
  return { exportId, jobId: (jobRow as { id: string }).id };
}

export async function updateExportProgress(client: Db, exportId: string, jobId: string, status: ExportStatus, progress: number, message?: string): Promise<void> {
  const patch = { status, progress, error_message: status === "failed" ? message ?? null : null, updated_at: new Date().toISOString() };
  const { error: exportError } = await client.from("exports").update(patch as never).eq("id", exportId);
  if (exportError) throw exportError;
  const { error: jobError } = await client.from("export_jobs").update({ status, progress, last_error: status === "failed" ? message ?? null : null, updated_at: new Date().toISOString(), started_at: status === "active" ? new Date().toISOString() : undefined } as never).eq("id", jobId);
  if (jobError) throw jobError;
}

export async function recordRenderTask(client: Db, data: { exportId: string; jobId: string; status: ExportStatus; renderer: string; input: unknown; output?: unknown; error?: string }): Promise<void> {
  const { error } = await client.from("render_tasks").insert({ export_id: data.exportId, export_job_id: data.jobId, status: data.status, renderer: data.renderer, input: data.input, output: data.output ?? {}, error_message: data.error ?? null } as never);
  if (error) throw error;
}

export async function completeExport(client: Db, data: ExportJobData, artifact: RenderedArtifact, storage: { bucket: string; path: string; signedUrl: string; expiresAt: string }): Promise<ExportResult> {
  const completedAt = new Date().toISOString();
  const { error: exportError } = await client.from("exports").update({ status: "completed", progress: 100, bucket: storage.bucket, storage_path: storage.path, signed_url_expires_at: storage.expiresAt, mime_type: artifact.mimeType, size_bytes: artifact.bytes, width: artifact.width ?? null, height: artifact.height ?? null, page_count: artifact.pageCount, metadata: artifact.metadata, completed_at: completedAt, updated_at: completedAt } as never).eq("id", data.exportId);
  if (exportError) throw exportError;
  const { error: jobError } = await client.from("export_jobs").update({ status: "completed", progress: 100, completed_at: completedAt, updated_at: completedAt } as never).eq("id", data.jobId);
  if (jobError) throw jobError;
  return { exportId: data.exportId, jobId: data.jobId, status: "completed", bucket: storage.bucket, path: storage.path, signedUrl: storage.signedUrl, expiresAt: storage.expiresAt, mimeType: artifact.mimeType, sizeBytes: artifact.bytes, width: artifact.width, height: artifact.height, pageCount: artifact.pageCount };
}

export async function getExportStatus(client: Db, exportOrJobId: string, userId: string) {
  const { data, error } = await client.from("exports").select("*, export_jobs(*)").or(`id.eq.${exportOrJobId}`).eq("requested_by", userId).maybeSingle();
  if (error) throw error;
  return data;
}
