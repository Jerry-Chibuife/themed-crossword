import { APICallError } from "ai";
import { afterEach, describe, expect, it } from "vitest";
import {
  classifyLlmError,
  httpStatusForClueCode,
  messageForClueCode,
  nvidiaStatusFromError,
  sanitizeLlmErrorDetail,
} from "@/lib/ai/errors";
import { DEFAULT_NVIDIA_MODEL, getNvidiaModelId } from "@/lib/ai/nvidia";

function apiError(statusCode: number, message: string) {
  return new APICallError({
    message,
    url: "https://integrate.api.nvidia.com/v1/chat/completions",
    requestBodyValues: {},
    statusCode,
    isRetryable: false,
  });
}

describe("classifyLlmError", () => {
  it("classifies NVIDIA 410 Gone as model_unavailable", () => {
    const error = apiError(410, "Gone");
    expect(classifyLlmError(error)).toBe("model_unavailable");
    expect(nvidiaStatusFromError(error)).toBe(410);
  });

  it("classifies NVIDIA 404 as model_unavailable", () => {
    const error = apiError(404, "Function not found");
    expect(classifyLlmError(error)).toBe("model_unavailable");
    expect(nvidiaStatusFromError(error)).toBe(404);
  });

  it("classifies NVIDIA 400 as model_unavailable", () => {
    const error = apiError(400, "Bad request");
    expect(classifyLlmError(error)).toBe("model_unavailable");
    expect(nvidiaStatusFromError(error)).toBe(400);
  });

  it("walks wrapped causes for 410", () => {
    const cause = apiError(410, "Gone");
    const wrapped = new Error("NVIDIA request failed", { cause });
    expect(classifyLlmError(wrapped)).toBe("model_unavailable");
    expect(nvidiaStatusFromError(wrapped)).toBe(410);
  });

  it("classifies 429 as rate_limited, not model_unavailable", () => {
    expect(classifyLlmError(apiError(429, "Too Many Requests"))).toBe(
      "rate_limited",
    );
    expect(classifyLlmError(new Error("429 Too Many Requests"))).toBe(
      "rate_limited",
    );
  });

  it("classifies 410 Gone from the error message when status is missing", () => {
    expect(classifyLlmError(new Error("NVIDIA 410 Gone"))).toBe(
      "model_unavailable",
    );
  });

  it("does not treat unrelated 'gone' substrings as model_unavailable", () => {
    expect(classifyLlmError(new Error("request undergone retry"))).toBe(
      "failed",
    );
  });

  it("falls back to failed for other statuses", () => {
    expect(classifyLlmError(apiError(500, "Internal"))).toBe("failed");
    expect(classifyLlmError(new Error("boom"))).toBe("failed");
  });
});

describe("messageForClueCode", () => {
  it("names the configured model on model_unavailable", () => {
    expect(messageForClueCode("model_unavailable", "deepseek-ai/deepseek-v4-flash")).toContain(
      "deepseek-ai/deepseek-v4-flash",
    );
    expect(httpStatusForClueCode("model_unavailable")).toBe(502);
  });
});

describe("sanitizeLlmErrorDetail", () => {
  it("redacts NVIDIA key prefixes", () => {
    expect(
      sanitizeLlmErrorDetail(new Error("auth nvapi-SECRETVALUE123 failed")),
    ).toBe("auth nvapi-[redacted] failed");
  });
});

describe("getNvidiaModelId", () => {
  const previous = process.env.NVIDIA_MODEL;

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.NVIDIA_MODEL;
    } else {
      process.env.NVIDIA_MODEL = previous;
    }
  });

  it("defaults to nemotron-3-nano", () => {
    delete process.env.NVIDIA_MODEL;
    expect(getNvidiaModelId()).toBe(DEFAULT_NVIDIA_MODEL);
    expect(DEFAULT_NVIDIA_MODEL).toBe("nvidia/nemotron-3-nano-30b-a3b");
  });

  it("honors NVIDIA_MODEL override", () => {
    process.env.NVIDIA_MODEL = "some-org/some-model";
    expect(getNvidiaModelId()).toBe("some-org/some-model");
  });
});
