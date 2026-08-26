import { APICallError } from "ai";

export type ClueErrorCode =
  | "rate_limited"
  | "timeout"
  | "empty"
  | "failed";

export class ClueGenerateError extends Error {
  readonly code: ClueErrorCode;

  constructor(code: ClueErrorCode, message: string) {
    super(message);
    this.name = "ClueGenerateError";
    this.code = code;
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
  if (
    error instanceof Error &&
    /429|too many requests/i.test(error.message)
  ) {
    return "rate_limited";
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
    case "empty":
    case "failed":
      return 500;
    default: {
      const exhaustive: never = code;
      return exhaustive;
    }
  }
}

export function messageForClueCode(code: ClueErrorCode): string {
  switch (code) {
    case "rate_limited":
      return "NVIDIA rate limit hit. Wait a few seconds and try again.";
    case "timeout":
      return "Clue generation timed out before any clues arrived. Try again.";
    case "empty":
      return "The model returned no usable clues. Try again.";
    case "failed":
      return "Failed to generate clues. Try again.";
    default: {
      const exhaustive: never = code;
      return exhaustive;
    }
  }
}
