import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
/**
 * Default NIM id that currently returns 200 for this project’s key.
 * `deepseek-ai/deepseek-v4-flash` is retired (HTTP 410). Override with NVIDIA_MODEL.
 * NVIDIA_MODEL is inlined at Next.js build time — changing Vercel env requires a redeploy.
 */
export const DEFAULT_NVIDIA_MODEL = "nvidia/nemotron-3-nano-30b-a3b";

export function getNvidiaModelId(): string {
  return process.env.NVIDIA_MODEL?.trim() || DEFAULT_NVIDIA_MODEL;
}

export function createNvidiaProvider() {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY is not configured");
  }

  return createOpenAICompatible({
    name: "nvidia",
    apiKey,
    baseURL: NVIDIA_BASE_URL,
  });
}

export function getNvidiaLanguageModel() {
  const provider = createNvidiaProvider();
  return provider(getNvidiaModelId());
}
