import type { DesignScore, FabricDesign, PalettePlan } from "../types/design";

export function scoreDesign(design: FabricDesign, palette: PalettePlan): DesignScore {
  const hasText = design.objects.some((object) => object.type === "i-text" || object.type === "text");
  const hasContrast = palette.contrastScore >= 4.5;
  const issues = [];
  if (!hasText) issues.push("Design has no editable text objects.");
  if (!hasContrast) issues.push("Palette contrast is below WCAG recommendation.");
  const accessibility = hasContrast ? 92 : 55;
  const hierarchy = hasText ? 88 : 40;
  return { accessibility, brandConsistency: 86, hierarchy, alignment: 90, overall: Math.round((accessibility + hierarchy + 86 + 90) / 4), issues };
}
