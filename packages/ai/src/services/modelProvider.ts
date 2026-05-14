import { ChatOpenAI } from "@langchain/openai";
import OpenAI from "openai";
import { getServerEnv } from "@canva-ai/env/server";

export interface ModelOptions { temperature?: number; model?: string; maxRetries?: number }

export function hasOpenAIKey() {
  return Boolean(getServerEnv().OPENAI_API_KEY);
}

export function getDesignModel(options: ModelOptions = {}) {
  const env = getServerEnv();
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required for AI design generation");
  return new ChatOpenAI({
    apiKey: env.OPENAI_API_KEY,
    model: options.model ?? env.OPENAI_MODEL ?? "gpt-4o",
    temperature: options.temperature ?? 0.2,
    maxRetries: options.maxRetries ?? 2
  });
}

export function getOpenAIClient() {
  const env = getServerEnv();
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required for OpenAI image generation");
  return new OpenAI({ apiKey: env.OPENAI_API_KEY });
}
