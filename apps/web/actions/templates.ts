"use server";

import { revalidatePath } from "next/cache";
import { createTemplate, duplicateTemplate, publishTemplate } from "@canva-ai/templates";
import { createSupabaseServerClient } from "../lib/supabase/server";
import { requireUser } from "../server/auth";

export async function createTemplateAction(input: Parameters<typeof createTemplate>[1]) {
  try {
    const user = await requireUser();
    const db = await createSupabaseServerClient();
    const template = await createTemplate(db, { ...input, ownerId: user.id });
    revalidatePath("/templates");
    return { ok: true, data: template } as const;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to create template" } as const;
  }
}

export async function duplicateTemplateAction(templateId: string, workspaceId: string) {
  try {
    const user = await requireUser();
    const db = await createSupabaseServerClient();
    const template = await duplicateTemplate(db, templateId, workspaceId, user.id);
    revalidatePath("/templates");
    return { ok: true, data: template } as const;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to duplicate template" } as const;
  }
}

export async function publishTemplateAction(templateId: string) {
  try {
    await requireUser();
    const db = await createSupabaseServerClient();
    const template = await publishTemplate(db, templateId);
    revalidatePath("/templates");
    return { ok: true, data: template } as const;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to publish template" } as const;
  }
}
