import { getOpenAIClient } from "./modelProvider";

export async function generateImage(prompt: string, size: "1024x1024" | "1024x1536" | "1536x1024" = "1024x1024") {
  const client = getOpenAIClient();
  const response = await client.images.generate({ model: "gpt-image-1", prompt, size });
  const image = response.data?.[0];
  if (!image?.b64_json) throw new Error("OpenAI image generation did not return image data");
  return { b64Json: image.b64_json, revisedPrompt: (image as { revised_prompt?: string }).revised_prompt };
}
