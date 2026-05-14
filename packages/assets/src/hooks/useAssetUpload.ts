"use client";
import { useCallback } from "react";
import { useAssetStore } from "../store/assetStore";
import { validateFileForUpload } from "../upload/validation";

export interface SignedUploadResponse { signedUrl: string; token: string; path: string; bucket: string; asset: { id: string } }

export function useAssetUpload(createSignedUpload: (file: File) => Promise<SignedUploadResponse>, markComplete?: (assetId: string) => Promise<void>) {
  const upsertUpload = useAssetStore((state) => state.upsertUpload);
  return useCallback(async (file: File) => {
    validateFileForUpload(file);
    const id = crypto.randomUUID();
    upsertUpload({ id, filename: file.name, progress: 0, status: "queued" });
    try {
      upsertUpload({ id, filename: file.name, progress: 5, status: "uploading" });
      const signed = await createSignedUpload(file);
      const response = await fetch(signed.signedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
      upsertUpload({ id, filename: file.name, progress: 90, status: "processing" });
      await markComplete?.(signed.asset.id);
      upsertUpload({ id, filename: file.name, progress: 100, status: "complete" });
      return signed.asset.id;
    } catch (error) {
      upsertUpload({ id, filename: file.name, progress: 0, status: "error", error: error instanceof Error ? error.message : "Upload failed" });
      throw error;
    }
  }, [createSignedUpload, markComplete, upsertUpload]);
}
