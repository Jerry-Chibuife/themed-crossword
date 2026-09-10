import { describe, expect, it } from "vitest";
import {
  clampRateLimitWaitSeconds,
  retryAfterSecondsFromHeader,
} from "@/lib/api/retry-after";
import {
  CLUE_BATCH_SIZE,
  MAX_CLUE_BATCHES,
  MIN_PUZZLE_WORDS,
  RATE_LIMIT_WAIT_DEFAULT_SECONDS,
  TARGET_PUZZLE_WORDS,
  isWaitAndRetryCode,
} from "@/lib/api/schemas";

describe("generate policy", () => {
  it("keeps small batches that can fill a 15-word puzzle", () => {
    expect(CLUE_BATCH_SIZE).toBe(6);
    expect(TARGET_PUZZLE_WORDS).toBe(15);
    expect(MIN_PUZZLE_WORDS).toBe(12);
    expect(MIN_PUZZLE_WORDS).toBeLessThanOrEqual(TARGET_PUZZLE_WORDS);
    expect(CLUE_BATCH_SIZE * MAX_CLUE_BATCHES).toBeGreaterThanOrEqual(
      TARGET_PUZZLE_WORDS,
    );
  });

  it("treats 429 and 503 as wait-and-retry", () => {
    expect(isWaitAndRetryCode("rate_limited")).toBe(true);
    expect(isWaitAndRetryCode("overloaded")).toBe(true);
    expect(isWaitAndRetryCode("failed")).toBe(false);
  });
});

describe("retryAfterSecondsFromHeader", () => {
  it("parses delta-seconds and clamps", () => {
    expect(retryAfterSecondsFromHeader("12")).toBe(12);
    expect(retryAfterSecondsFromHeader("1")).toBe(2);
    expect(retryAfterSecondsFromHeader("120")).toBe(30);
  });

  it("defaults when missing or junk", () => {
    expect(retryAfterSecondsFromHeader(null)).toBe(
      RATE_LIMIT_WAIT_DEFAULT_SECONDS,
    );
    expect(retryAfterSecondsFromHeader("nope")).toBe(
      RATE_LIMIT_WAIT_DEFAULT_SECONDS,
    );
  });

  it("parses HTTP-date in the near future", () => {
    const when = new Date(Date.now() + 5000).toUTCString();
    const seconds = retryAfterSecondsFromHeader(when);
    expect(seconds).toBeGreaterThanOrEqual(2);
    expect(seconds).toBeLessThanOrEqual(10);
  });
});

describe("clampRateLimitWaitSeconds", () => {
  it("uses the default for NaN", () => {
    expect(clampRateLimitWaitSeconds(Number.NaN)).toBe(
      RATE_LIMIT_WAIT_DEFAULT_SECONDS,
    );
  });
});
