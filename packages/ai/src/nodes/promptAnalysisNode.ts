import { promptAnalysisSchema, type DesignWorkflowState } from "../types/design";
import { getDesignModel } from "../services/modelProvider";
import { sanitizePrompt } from "../utils/sanitize";
import { promptAnalysisPrompt } from "../prompts/designPrompts";

export async function promptAnalysisNode(state: DesignWorkflowState): Promise<Partial<DesignWorkflowState>> {
  const prompt = sanitizePrompt(state.request.prompt);
  const model = getDesignModel({ temperature: state.request.deterministic ? 0 : 0.4 }).withStructuredOutput(promptAnalysisSchema, { name: "prompt_analysis" });
  const analysis = promptAnalysisSchema.parse(await model.invoke([
    ["system", promptAnalysisPrompt],
    ["user", `Prompt: ${prompt}\nRequested target: ${state.request.target}\nMode: ${state.request.mode}`]
  ]));
  return { analysis, trace: [...state.trace, "prompt-analysis"] };
}
