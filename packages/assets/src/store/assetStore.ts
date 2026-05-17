"use client";
import { create } from "zustand";

export interface UploadProgress { id: string; filename: string; progress: number; status: "queued" | "uploading" | "processing" | "complete" | "error"; error?: string }

interface AssetStore {
  query: string;
  kind: string;
  selectedTags: string[];
  uploads: UploadProgress[];
  setQuery: (query: string) => void;
  setKind: (kind: string) => void;
  toggleTag: (tag: string) => void;
  upsertUpload: (upload: UploadProgress) => void;
  removeUpload: (id: string) => void;
}

export const useAssetStore = create<AssetStore>((set) => ({
  query: "",
  kind: "all",
  selectedTags: [],
  uploads: [],
  setQuery: (query) => set({ query }),
  setKind: (kind) => set({ kind }),
  toggleTag: (tag) => set((state) => ({ selectedTags: state.selectedTags.includes(tag) ? state.selectedTags.filter((item) => item !== tag) : [...state.selectedTags, tag] })),
  upsertUpload: (upload) => set((state) => ({ uploads: [upload, ...state.uploads.filter((item) => item.id !== upload.id)] })),
  removeUpload: (id) => set((state) => ({ uploads: state.uploads.filter((item) => item.id !== id) }))
}));
