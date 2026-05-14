import { z } from "zod";

export const platformTargetSchema = z.enum(["instagram-post", "instagram-story", "facebook-post", "linkedin-post", "youtube-thumbnail", "presentation-slide", "poster", "ad-square", "ad-landscape"]);

export const dimensionsByTarget: Record<z.infer<typeof platformTargetSchema>, { width: number; height: number }> = {
  "instagram-post": { width: 1080, height: 1080 },
  "instagram-story": { width: 1080, height: 1920 },
  "facebook-post": { width: 1200, height: 630 },
  "linkedin-post": { width: 1200, height: 627 },
  "youtube-thumbnail": { width: 1280, height: 720 },
  "presentation-slide": { width: 1920, height: 1080 },
  poster: { width: 1080, height: 1440 },
  "ad-square": { width: 1080, height: 1080 },
  "ad-landscape": { width: 1200, height: 628 }
};

export const brandProfileSchema = z.object({
  name: z.string().optional(),
  colors: z.array(z.string()).default([]),
  fonts: z.array(z.object({ family: z.string(), role: z.enum(["heading", "body", "accent"]).default("body") })).default([]),
  logoUrl: z.string().url().optional(),
  tone: z.string().optional(),
  spacing: z.enum(["compact", "balanced", "spacious"]).default("balanced")
});

export const promptAnalysisSchema = z.object({
  intent: z.string(),
  audience: z.string(),
  format: platformTargetSchema,
  industry: z.string(),
  tone: z.string(),
  primaryMessage: z.string(),
  callToAction: z.string(),
  visualStyle: z.string(),
  contentSuggestions: z.array(z.string()).default([]),
  needsImageGeneration: z.boolean().default(false)
});

export const layoutPlanSchema = z.object({
  name: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  safeMargin: z.number().int().positive(),
  hierarchy: z.array(z.object({ role: z.enum(["headline", "subhead", "body", "cta", "logo", "image", "shape"]), x: z.number(), y: z.number(), width: z.number(), height: z.number(), zIndex: z.number() }))
});

export const typographyPlanSchema = z.object({
  headingFont: z.string(),
  bodyFont: z.string(),
  accentFont: z.string(),
  headingSize: z.number().int().positive(),
  bodySize: z.number().int().positive(),
  ctaSize: z.number().int().positive(),
  rationale: z.string()
});

export const palettePlanSchema = z.object({
  background: z.string(),
  primary: z.string(),
  secondary: z.string(),
  accent: z.string(),
  text: z.string(),
  contrastScore: z.number().min(0).max(21),
  rationale: z.string()
});

export const fabricObjectSchema = z.record(z.string(), z.unknown());
export const fabricDesignSchema = z.object({ version: z.string().default("6.0.0"), objects: z.array(fabricObjectSchema), background: z.string().optional(), width: z.number().optional(), height: z.number().optional() });

export const designGenerationRequestSchema = z.object({
  prompt: z.string().min(8).max(2000),
  workspaceId: z.string().uuid().optional(),
  target: platformTargetSchema.default("instagram-post"),
  brand: brandProfileSchema.optional(),
  mode: z.enum(["marketing", "template", "enhance", "scene"]).default("marketing"),
  deterministic: z.boolean().default(true)
});

export const resizeRequestSchema = z.object({
  source: fabricDesignSchema,
  target: platformTargetSchema,
  brand: brandProfileSchema.optional()
});

export type PlatformTarget = z.infer<typeof platformTargetSchema>;
export type BrandProfile = z.infer<typeof brandProfileSchema>;
export type PromptAnalysis = z.infer<typeof promptAnalysisSchema>;
export type LayoutPlan = z.infer<typeof layoutPlanSchema>;
export type TypographyPlan = z.infer<typeof typographyPlanSchema>;
export type PalettePlan = z.infer<typeof palettePlanSchema>;
export type FabricDesign = z.infer<typeof fabricDesignSchema>;
export type DesignGenerationRequest = z.infer<typeof designGenerationRequestSchema>;
export type ResizeRequest = z.infer<typeof resizeRequestSchema>;

export interface AssetCandidate { id?: string; url?: string; kind: "image" | "video" | "svg" | "shape"; label: string; tags: string[] }
export interface DesignScore { accessibility: number; brandConsistency: number; hierarchy: number; alignment: number; overall: number; issues: string[] }

export interface DesignWorkflowState {
  request: DesignGenerationRequest;
  analysis?: PromptAnalysis;
  layout?: LayoutPlan;
  typography?: TypographyPlan;
  palette?: PalettePlan;
  assets: AssetCandidate[];
  fabricJson?: FabricDesign;
  score?: DesignScore;
  imagePrompt?: string;
  generatedImageUrl?: string;
  errors: string[];
  trace: string[];
}
