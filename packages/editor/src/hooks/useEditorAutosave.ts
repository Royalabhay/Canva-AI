"use client";

import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "../store/editorStore";
import type { CanvasSnapshot } from "../types/editor";

export interface AutosaveConfig {
  designId?: string;
  endpoint?: string;
  debounceMs?: number;
  enabled?: boolean;
}

export type AutosaveStatus = "idle" | "saving" | "saved" | "error" | "offline";

export function useEditorAutosave({ debounceMs = 1500, designId, enabled = true, endpoint = "/api/designs/autosave" }: AutosaveConfig): AutosaveStatus {
  const historyLength = useEditorStore((state) => state.history.length);
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const lastSavedRef = useRef<string | null>(null);
  const pendingRef = useRef<CanvasSnapshot | null>(null);

  useEffect(() => {
    if (!enabled || !designId || historyLength === 0) return;
    const snapshot = useEditorStore.getState().history.at(-1);
    if (!snapshot) return;
    const serialized = JSON.stringify(snapshot);
    if (serialized === lastSavedRef.current) return;
    pendingRef.current = snapshot;

    const timer = setTimeout(async () => {
      if (!pendingRef.current) return;
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setStatus("offline");
        return;
      }
      setStatus("saving");
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ designId, fabricJson: pendingRef.current })
        });
        const result = await response.json() as { ok?: boolean; error?: string };
        if (!response.ok || !result.ok) throw new Error(result.error ?? "Autosave failed");
        lastSavedRef.current = JSON.stringify(pendingRef.current);
        pendingRef.current = null;
        setStatus("saved");
      } catch (error) {
        console.error(error);
        setStatus("error");
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [debounceMs, designId, enabled, endpoint, historyLength]);

  return status;
}
