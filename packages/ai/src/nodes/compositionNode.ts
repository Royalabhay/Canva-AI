import type { DesignWorkflowState } from "../types/design";
import { composeFabricDesign } from "../tools/fabricComposer";

export async function compositionNode(state: DesignWorkflowState): Promise<Partial<DesignWorkflowState>> {
  if (!state.analysis || !state.layout || !state.typography || !state.palette) throw new Error("Analysis, layout, typography, and palette are required before composition");
  const fabricJson = composeFabricDesign(state.analysis, state.layout, state.typography, state.palette, state.assets, state.request.brand);
  return { fabricJson, trace: [...state.trace, "composition"] };
}
