import type { AssetCandidate, FabricDesign, LayoutPlan, PalettePlan, PromptAnalysis, TypographyPlan, BrandProfile } from "../types/design";

function textObject(id: string, text: string, left: number, top: number, width: number, fontSize: number, fill: string, fontFamily: string, fontWeight = 700) {
  return { id, name: id, type: "i-text", version: "6.0.0", text, left, top, width, fontSize, fill, fontFamily, fontWeight, splitByGrapheme: false, selectable: true, evented: true };
}

export function composeFabricDesign(analysis: PromptAnalysis, layout: LayoutPlan, typography: TypographyPlan, palette: PalettePlan, assets: AssetCandidate[], brand?: BrandProfile): FabricDesign {
  const hero = layout.hierarchy.find((item) => item.role === "image");
  const headline = layout.hierarchy.find((item) => item.role === "headline")!;
  const body = layout.hierarchy.find((item) => item.role === "body")!;
  const cta = layout.hierarchy.find((item) => item.role === "cta")!;
  const objects: Record<string, unknown>[] = [
    { id: "ai-background", name: "AI Background", type: "rect", left: 0, top: 0, width: layout.width, height: layout.height, fill: palette.background, selectable: true, evented: true },
    { id: "ai-accent-band", name: "AI Accent Band", type: "rect", left: 0, top: Math.round(layout.height * 0.72), width: layout.width, height: Math.round(layout.height * 0.28), fill: palette.primary, opacity: 0.08, selectable: true, evented: true }
  ];
  if (hero) {
    objects.push({ id: "ai-hero-shape", name: "AI Hero Shape", type: "rect", left: hero.x, top: hero.y, width: hero.width, height: hero.height, rx: 36, ry: 36, fill: palette.secondary, opacity: 0.22, selectable: true, evented: true });
    const asset = assets.find((item) => item.url && item.kind === "image");
    if (asset?.url) objects.push({ id: "ai-hero-image", name: asset.label, type: "image", src: asset.url, left: hero.x, top: hero.y, width: hero.width, height: hero.height, scaleX: 1, scaleY: 1, selectable: true, evented: true });
  }
  objects.push(textObject("ai-headline", analysis.primaryMessage, headline.x, headline.y, headline.width, typography.headingSize, palette.text, typography.headingFont, 800));
  objects.push(textObject("ai-body", analysis.contentSuggestions[0] ?? `${analysis.visualStyle} creative for ${analysis.audience}.`, body.x, body.y, body.width, typography.bodySize, palette.text, typography.bodyFont, 400));
  objects.push({ id: "ai-cta-bg", name: "AI CTA", type: "rect", left: cta.x, top: cta.y, width: cta.width, height: cta.height, rx: 32, ry: 32, fill: palette.accent, selectable: true, evented: true });
  objects.push(textObject("ai-cta-text", analysis.callToAction, cta.x + 30, cta.y + 23, cta.width - 60, typography.ctaSize, "#ffffff", typography.accentFont, 700));
  if (brand?.logoUrl) objects.push({ id: "ai-brand-logo", name: "Brand Logo", type: "image", src: brand.logoUrl, left: layout.width - layout.safeMargin - 160, top: layout.height - layout.safeMargin - 80, width: 160, height: 80, selectable: true, evented: true });
  return { version: "6.0.0", width: layout.width, height: layout.height, background: palette.background, objects };
}
