import type { DesignWorkflowState } from "../types/design";
import { recommendTypography } from "../tools/typographyTool";

export async function typographyNode(state: DesignWorkflowState): Promise<Partial<DesignWorkflowState>> {
  if (!state.layout) throw new Error("Layout is required before typography generation");
  return { typography: recommendTypography(state.layout, state.request.brand), trace: [...state.trace, "typography"] };
}
