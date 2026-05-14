import { designGenerationRequestSchema, type DesignGenerationRequest, type DesignWorkflowState } from "../types/design";
import { createPromptToDesignGraph } from "../graphs/designGraph";
import { sanitizePrompt } from "../utils/sanitize";
import { assertRateLimit } from "../services/rateLimit";

export async function generateDesignFromPrompt(input: DesignGenerationRequest, rateLimitKey = "anonymous") {
  const request = designGenerationRequestSchema.parse({ ...input, prompt: sanitizePrompt(input.prompt) });
  assertRateLimit(rateLimitKey);
  const graph = createPromptToDesignGraph();
  const initial: DesignWorkflowState = { request, assets: [], errors: [], trace: [] };
  return graph.invoke(initial);
}

export async function* streamDesignFromPrompt(input: DesignGenerationRequest, rateLimitKey = "anonymous") {
  const request = designGenerationRequestSchema.parse({ ...input, prompt: sanitizePrompt(input.prompt) });
  assertRateLimit(rateLimitKey);
  const graph = createPromptToDesignGraph();
  const initial: DesignWorkflowState = { request, assets: [], errors: [], trace: [] };
  for await (const chunk of await graph.stream(initial, { streamMode: "updates" })) {
    yield chunk;
  }
}
