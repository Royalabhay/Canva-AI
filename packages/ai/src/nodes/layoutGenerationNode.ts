import type { DesignWorkflowState } from "../types/design";
import { generateLayoutPlan } from "../tools/layoutTool";

export async function layoutGenerationNode(state: DesignWorkflowState): Promise<Partial<DesignWorkflowState>> {
  const target = state.analysis?.format ?? state.request.target;
  return { layout: generateLayoutPlan(target), trace: [...state.trace, "layout-generation"] };
}
