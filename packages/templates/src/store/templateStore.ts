"use client";
import { create } from "zustand";
import type { TemplateCategorySlug, TemplateRecord, TemplateVisibility } from "../services/templateService";

interface TemplateStore {
  query: string;
  category: TemplateCategorySlug | "all";
  visibility: TemplateVisibility | "all";
  favorites: Set<string>;
  recentTemplateIds: string[];
  setQuery: (query: string) => void;
  setCategory: (category: TemplateCategorySlug | "all") => void;
  setVisibility: (visibility: TemplateVisibility | "all") => void;
  toggleFavorite: (templateId: string) => void;
  markRecent: (template: TemplateRecord) => void;
}

export const useTemplateStore = create<TemplateStore>((set) => ({
  query: "",
  category: "all",
  visibility: "all",
  favorites: new Set(),
  recentTemplateIds: [],
  setQuery: (query) => set({ query }),
  setCategory: (category) => set({ category }),
  setVisibility: (visibility) => set({ visibility }),
  toggleFavorite: (templateId) => set((state) => {
    const favorites = new Set(state.favorites);
    if (favorites.has(templateId)) favorites.delete(templateId); else favorites.add(templateId);
    return { favorites };
  }),
  markRecent: (template) => set((state) => ({ recentTemplateIds: [template.id, ...state.recentTemplateIds.filter((id) => id !== template.id)].slice(0, 20) }))
}));
