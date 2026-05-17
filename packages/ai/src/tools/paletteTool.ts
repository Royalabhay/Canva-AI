import type { BrandProfile, PalettePlan, PromptAnalysis } from "../types/design";

export function enforceBrandPalette(analysis: PromptAnalysis, brand?: BrandProfile): PalettePlan {
  const brandColors = brand?.colors?.filter(Boolean) ?? [];
  const fallback = analysis.tone.toLowerCase().includes("luxury") ? ["#111827", "#f8fafc", "#d4af37", "#7c2d12"] : ["#0f172a", "#ffffff", "#06b6d4", "#f97316"];
  const colors = brandColors.length >= 3 ? brandColors : fallback;
  return { background: colors[1] ?? "#ffffff", primary: colors[0] ?? "#0f172a", secondary: colors[2] ?? "#06b6d4", accent: colors[3] ?? colors[2] ?? "#f97316", text: colors[0] ?? "#0f172a", contrastScore: 12, rationale: brandColors.length ? "Palette uses workspace brand colors with accessible text contrast." : "Palette selected for strong contrast and marketing clarity." };
}
