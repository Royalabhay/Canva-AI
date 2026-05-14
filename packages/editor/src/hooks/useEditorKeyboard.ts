"use client";

import { useEffect } from "react";
import type { EditorActions } from "../types/editor";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export function useEditorKeyboard(actions: EditorActions): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const meta = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (meta && key === "z") {
        event.preventDefault();
        void (event.shiftKey ? actions.redo() : actions.undo());
        return;
      }

      if (meta && key === "y") {
        event.preventDefault();
        void actions.redo();
        return;
      }

      if (meta && key === "c") {
        event.preventDefault();
        void actions.copy();
        return;
      }

      if (meta && key === "v") {
        event.preventDefault();
        void actions.paste();
        return;
      }

      if (meta && key === "d") {
        event.preventDefault();
        void actions.duplicate();
        return;
      }

      if ((event.key === "Delete" || event.key === "Backspace") && !meta) {
        event.preventDefault();
        actions.removeSelection();
        return;
      }

      if (meta && (event.key === "+" || event.key === "=")) {
        event.preventDefault();
        actions.zoomIn();
        return;
      }

      if (meta && event.key === "-") {
        event.preventDefault();
        actions.zoomOut();
        return;
      }

      if (meta && event.key === "0") {
        event.preventDefault();
        actions.resetZoom();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [actions]);
}
