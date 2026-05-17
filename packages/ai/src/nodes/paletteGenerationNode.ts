import type { DesignWorkflowState } from "../types/design";
import { enforceBrandPalette } from "../tools/paletteTool";

export async function paletteGenerationNode(state: DesignWorkflowState): Promise<Partial<DesignWorkflowState>> {
  if (!state.analysis) throw new Error("Prompt analysis is required before palette generation");
  return { palette: enforceBrandPalette(state.analysis, state.request.brand), trace: [...state.trace, "palette-generation"] };
}
