import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { generateLayoutPlan } from "../tools/layoutTool";
import { enforceBrandPalette } from "../tools/paletteTool";

export const layoutGenerationTool = tool(async ({ target }) => JSON.stringify(generateLayoutPlan(target)), {
  name: "layout_generation",
  description: "Generate a platform-aware layout plan for a design.",
  schema: z.object({ target: z.enum(["instagram-post", "instagram-story", "facebook-post", "linkedin-post", "youtube-thumbnail", "presentation-slide", "poster", "ad-square", "ad-landscape"]) })
});

export const paletteGenerationTool = tool(async ({ tone }) => JSON.stringify(enforceBrandPalette({ intent: "marketing", audience: "customers", format: "instagram-post", industry: "general", tone, primaryMessage: "", callToAction: "", visualStyle: "modern", contentSuggestions: [], needsImageGeneration: false })), {
  name: "palette_generation",
  description: "Generate an accessible design palette from tone and optional brand context.",
  schema: z.object({ tone: z.string() })
});

export const designTools = [layoutGenerationTool, paletteGenerationTool];
