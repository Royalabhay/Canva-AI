import type { AssetCandidate, DesignWorkflowState } from "../types/design";

export async function assetSelectionNode(state: DesignWorkflowState): Promise<Partial<DesignWorkflowState>> {
  const analysis = state.analysis;
  const assets: AssetCandidate[] = [];
  if (analysis?.needsImageGeneration) {
    return { assets, imagePrompt: `${analysis.visualStyle} ${analysis.industry} marketing hero image for ${analysis.audience}`, trace: [...state.trace, "asset-selection:image-generation-needed"] };
  }
  assets.push({ kind: "shape", label: `${analysis?.visualStyle ?? "modern"} abstract hero shape`, tags: [analysis?.industry ?? "brand", "ai-generated-layout"] });
  return { assets, trace: [...state.trace, "asset-selection"] };
}
