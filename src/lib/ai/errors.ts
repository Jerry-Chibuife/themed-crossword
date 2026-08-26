import { APICallError } from "ai";
import { getNvidiaModelId } from "@/lib/ai/nvidia";

export type ClueErrorCode =
  | "rate_limited"
  | "timeout"
  | "empty"
  | "failed"
  | "model_unavailable";

const SECRET_RE = /nvapi-[A-Za-z0-9_-]+/gi;
const BEARER_RE = /Bearer\s+\S+/gi;

export class ClueGenerateError extends Error {
  readonly code: ClueErrorCode;
  readonly nvidiaStatus: number | undefined;

  constructor(
    code: ClueErrorCode,
    message: string,
    nvidiaStatus?: number,
  ) {
    super(message);
    this.name = "ClueGenerateError";
    this.code = code;
    this.nvidiaStatus = nvidiaStatus;
  }
}

function statusFromError(error: unknown): number | undefined {
  if (APICallError.isInstance(error) && typeof error.statusCode === "number") {
    return error.statusCode;
  }
  if (error instanceof Error && error.cause) {
    return statusFromError(error.cause);
  }
  return undefined;
}

export function nvidiaStatusFromError(error: unknown): number | undefined {
  return statusFromError(error);
}

export function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" ||
      error.name === "TimeoutError" ||
      /abort/i.test(error.message))
  );
}

export function classifyLlmError(error: unknown): ClueErrorCode {
  const status = statusFromError(error);
  if (status === 429) return "rate_limited";
  if (status === 400 || status === 404 || status === 410) {
    return "model_unavailable";
  }
  if (
    error instanceof Error &&
    /429|too many requests/i.test(error.message)
  ) {
    return "rate_limited";
  }
  if (
    error instanceof Error &&
    (/\b410\b|\bgone\b/i.test(error.message) ||
      /\b404\b|function not found/i.test(error.message))
  ) {
    return "model_unavailable";
  }
  if (isAbortError(error)) return "timeout";
  return "failed";
}

export function httpStatusForClueCode(code: ClueErrorCode): number {
  switch (code) {
    case "rate_limited":
      return 429;
    case "timeout":
      return 504;
    case "model_unavailable":
      return 502;
    case "empty":
    case "failed":
      return 500;
    default: {
      const exhaustive: never = code;
      return exhaustive;
    }
  }
}

export function messageForClueCode(
  code: ClueErrorCode,
  modelId = getNvidiaModelId(),
): string {
  switch (code) {
    case "rate_limited":
      return "NVIDIA rate limit hit. Wait a few seconds and try again.";
    case "timeout":
      return "Clue generation timed out before any clues arrived. Try again.";
    case "empty":
      return "The model returned no usable clues. Try again.";
    case "failed":
      return "Failed to generate clues. Try again.";
    case "model_unavailable":
      return `NVIDIA model "${modelId}" is unavailable or retired. Clear NVIDIA_MODEL on Vercel (or set a current model id) and redeploy.`;
    default: {
      const exhaustive: never = code;
      return exhaustive;
    }
  }
}

export function sanitizeLlmErrorDetail(error: unknown): string {
  const raw =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : String(error);
  return raw
    .replace(SECRET_RE, "nvapi-[redacted]")
    .replace(BEARER_RE, "Bearer [redacted]")
    .slice(0, 800);
}

function responseBodyFromError(error: unknown): string | undefined {
  if (APICallError.isInstance(error) && typeof error.responseBody === "string") {
    return sanitizeLlmErrorDetail(error.responseBody);
  }
  if (error instanceof Error && error.cause) {
    return responseBodyFromError(error.cause);
  }
  return undefined;
}

export function logClueError(
  scope: string,
  error: unknown,
  code: ClueErrorCode,
): void {
  console.error(`[${scope}] clue generation failed`, {
    code,
    model: getNvidiaModelId(),
    nvidiaStatus: nvidiaStatusFromError(error),
    detail: sanitizeLlmErrorDetail(error),
    nvidiaBody: responseBodyFromError(error),
  });
}
