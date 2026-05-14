import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type { AssetCandidate, DesignScore, DesignWorkflowState, FabricDesign, LayoutPlan, PalettePlan, PromptAnalysis, TypographyPlan } from "../types/design";
import { promptAnalysisNode } from "../nodes/promptAnalysisNode";
import { layoutGenerationNode } from "../nodes/layoutGenerationNode";
import { typographyNode } from "../nodes/typographyNode";
import { paletteGenerationNode } from "../nodes/paletteGenerationNode";
import { assetSelectionNode } from "../nodes/assetSelectionNode";
import { compositionNode } from "../nodes/compositionNode";
import { renderPreviewNode } from "../nodes/renderPreviewNode";

export const DesignGraphAnnotation = Annotation.Root({
  request: Annotation<DesignWorkflowState["request"]>(),
  analysis: Annotation<PromptAnalysis | undefined>(),
  layout: Annotation<LayoutPlan | undefined>(),
  typography: Annotation<TypographyPlan | undefined>(),
  palette: Annotation<PalettePlan | undefined>(),
  assets: Annotation<AssetCandidate[]>({ reducer: (_left, right) => right, default: () => [] }),
  fabricJson: Annotation<FabricDesign | undefined>(),
  score: Annotation<DesignScore | undefined>(),
  imagePrompt: Annotation<string | undefined>(),
  generatedImageUrl: Annotation<string | undefined>(),
  errors: Annotation<string[]>({ reducer: (left, right) => [...left, ...right], default: () => [] }),
  trace: Annotation<string[]>({ reducer: (_left, right) => right, default: () => [] })
});

function routeAfterAssetSelection(state: DesignWorkflowState) {
  return state.imagePrompt ? "compositionNode" : "compositionNode";
}

export function createPromptToDesignGraph() {
  return new StateGraph(DesignGraphAnnotation)
    .addNode("promptAnalysis", promptAnalysisNode)
    .addNode("layoutGeneration", layoutGenerationNode)
    .addNode("typographyNode", typographyNode)
    .addNode("assetSelection", assetSelectionNode)
    .addNode("paletteGeneration", paletteGenerationNode)
    .addNode("compositionNode", compositionNode)
    .addNode("renderPreview", renderPreviewNode)
    .addEdge(START, "promptAnalysis")
    .addEdge("promptAnalysis", "layoutGeneration")
    .addEdge("layoutGeneration", "typographyNode")
    .addEdge("typographyNode", "assetSelection")
    .addEdge("assetSelection", "paletteGeneration")
    .addConditionalEdges("paletteGeneration", routeAfterAssetSelection, { compositionNode: "compositionNode" })
    .addEdge("compositionNode", "renderPreview")
    .addEdge("renderPreview", END)
    .compile();
}
