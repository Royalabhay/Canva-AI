import type { FabricDesign, PalettePlan } from "../types/design";
import { scoreDesign } from "../tools/designScoringTool";

export function enhanceDesign(design: FabricDesign, palette?: PalettePlan): FabricDesign {
  const colors = palette ?? { background: "#ffffff", primary: "#0f172a", secondary: "#06b6d4", accent: "#f97316", text: "#0f172a", contrastScore: 12, rationale: "default" };
  const score = scoreDesign(design, colors);
  return {
    ...design,
    objects: design.objects.map((object, index) => ({
      ...object,
      id: typeof object.id === "string" ? object.id : `ai-enhanced-${index}`,
      name: typeof object.name === "string" ? object.name : `AI Enhanced ${index + 1}`,
      selectable: true,
      evented: true
    })),
    background: design.background ?? colors.background,
    metadata: { ...(design as { metadata?: Record<string, unknown> }).metadata, aiScore: score }
  } as FabricDesign;
}
