import type { DesignWorkflowState } from "../types/design";
import { scoreDesign } from "../tools/designScoringTool";

export async function renderPreviewNode(state: DesignWorkflowState): Promise<Partial<DesignWorkflowState>> {
  if (!state.fabricJson || !state.palette) throw new Error("Fabric JSON and palette are required before preview scoring");
  return { score: scoreDesign(state.fabricJson, state.palette), trace: [...state.trace, "preview-score"] };
}
