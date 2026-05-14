"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { autosaveDesign, createProject, createSignedAssetUpload, deleteProject, duplicateProject, updateProject } from "@canva-ai/database";
import { createSupabaseServerClient } from "../lib/supabase/server";
import { requireUser } from "../server/auth";

export type ActionState<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

async function authedDb() {
  const user = await requireUser();
  const db = await createSupabaseServerClient();
  return { user, db };
}

export async function createProjectAction(input: unknown): Promise<ActionState> {
  try {
    const { user, db } = await authedDb();
    const result = await createProject(db, user.id, input as never);
    revalidatePath("/dashboard");
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to create project" };
  }
}

export async function updateProjectAction(input: unknown): Promise<ActionState> {
  try {
    const { db } = await authedDb();
    const result = await updateProject(db, input as never);
    revalidatePath("/dashboard");
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to update project" };
  }
}

export async function deleteProjectAction(projectId: string): Promise<ActionState> {
  try {
    const { db } = await authedDb();
    const result = await deleteProject(db, z.string().uuid().parse(projectId));
    revalidatePath("/dashboard");
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to delete project" };
  }
}

export async function duplicateProjectAction(projectId: string): Promise<ActionState> {
  try {
    const { user, db } = await authedDb();
    const result = await duplicateProject(db, user.id, z.string().uuid().parse(projectId));
    revalidatePath("/dashboard");
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to duplicate project" };
  }
}

export async function autosaveDesignAction(input: unknown): Promise<ActionState> {
  try {
    const { db } = await authedDb();
    const result = await autosaveDesign(db, input as never);
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to autosave design" };
  }
}

export async function createSignedUploadAction(input: unknown): Promise<ActionState> {
  try {
    const { user, db } = await authedDb();
    const result = await createSignedAssetUpload(db, user.id, input as never);
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to create upload URL" };
  }
}
