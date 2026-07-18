import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
const DEFAULT_MODEL = "deepseek-ai/deepseek-v4-flash";

export function getNvidiaModelId(): string {
  return process.env.NVIDIA_MODEL?.trim() || DEFAULT_MODEL;
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
