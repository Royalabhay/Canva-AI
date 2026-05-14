"use server";

import { revalidatePath } from "next/cache";
import { createSignedWorkspaceUpload, markAssetReady } from "@canva-ai/assets";
import { createSupabaseServerClient } from "../lib/supabase/server";
import { requireUser } from "../server/auth";

export async function createSignedWorkspaceUploadAction(input: Omit<Parameters<typeof createSignedWorkspaceUpload>[1], "userId">) {
  try {
    const user = await requireUser();
    const db = await createSupabaseServerClient();
    const result = await createSignedWorkspaceUpload(db, { ...input, userId: user.id });
    revalidatePath("/assets");
    return { ok: true, data: result } as const;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to create signed upload" } as const;
  }
}

export async function markAssetReadyAction(assetId: string) {
  try {
    await requireUser();
    const db = await createSupabaseServerClient();
    const asset = await markAssetReady(db, assetId, { processedAt: new Date().toISOString() });
    revalidatePath("/assets");
    return { ok: true, data: asset } as const;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to finalize asset" } as const;
  }
}
