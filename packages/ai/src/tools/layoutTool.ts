import { dimensionsByTarget, type LayoutPlan, type PlatformTarget } from "../types/design";

export function generateLayoutPlan(target: PlatformTarget): LayoutPlan {
  const dimensions = dimensionsByTarget[target];
  const margin = Math.round(Math.min(dimensions.width, dimensions.height) * 0.08);
  const heroHeight = Math.round(dimensions.height * 0.48);
  return {
    name: `balanced-${target}`,
    width: dimensions.width,
    height: dimensions.height,
    safeMargin: margin,
    hierarchy: [
      { role: "shape", x: 0, y: 0, width: dimensions.width, height: dimensions.height, zIndex: 0 },
      { role: "image", x: margin, y: margin, width: dimensions.width - margin * 2, height: heroHeight, zIndex: 1 },
      { role: "headline", x: margin, y: heroHeight + margin, width: dimensions.width - margin * 2, height: Math.round(dimensions.height * 0.16), zIndex: 2 },
      { role: "body", x: margin, y: heroHeight + margin + Math.round(dimensions.height * 0.16), width: dimensions.width - margin * 2, height: Math.round(dimensions.height * 0.12), zIndex: 3 },
      { role: "cta", x: margin, y: dimensions.height - margin - 84, width: Math.round(dimensions.width * 0.42), height: 84, zIndex: 4 },
      { role: "logo", x: dimensions.width - margin - 160, y: dimensions.height - margin - 80, width: 160, height: 80, zIndex: 5 }
    ]
  };
}
