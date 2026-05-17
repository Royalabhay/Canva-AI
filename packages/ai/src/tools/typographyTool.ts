import type { BrandProfile, LayoutPlan, TypographyPlan } from "../types/design";

export function recommendTypography(layout: LayoutPlan, brand?: BrandProfile): TypographyPlan {
  const heading = brand?.fonts.find((font) => font.role === "heading")?.family ?? "Inter";
  const body = brand?.fonts.find((font) => font.role === "body")?.family ?? "Inter";
  const accent = brand?.fonts.find((font) => font.role === "accent")?.family ?? heading;
  const scale = Math.max(1, Math.min(layout.width, layout.height) / 1080);
  return { headingFont: heading, bodyFont: body, accentFont: accent, headingSize: Math.round(72 * scale), bodySize: Math.round(30 * scale), ctaSize: Math.round(34 * scale), rationale: "Font pairing prioritizes readable hierarchy and brand consistency." };
}
