export function sanitizePrompt(prompt: string): string {
  return prompt.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 2000);
}

export function createWorkflowId(prefix = "aiwf") {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomUUID()}`;
}
