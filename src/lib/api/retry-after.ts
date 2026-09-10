import {
  RATE_LIMIT_WAIT_DEFAULT_SECONDS,
  RATE_LIMIT_WAIT_MAX_SECONDS,
  RATE_LIMIT_WAIT_MIN_SECONDS,
} from "@/lib/api/schemas";

export function clampRateLimitWaitSeconds(seconds: number): number {
  if (!Number.isFinite(seconds)) return RATE_LIMIT_WAIT_DEFAULT_SECONDS;
  return Math.min(
    RATE_LIMIT_WAIT_MAX_SECONDS,
    Math.max(RATE_LIMIT_WAIT_MIN_SECONDS, Math.ceil(seconds)),
  );
}

/**
 * Parse Retry-After (delta-seconds or HTTP-date) into a clamped wait.
 * Returns the default when the header is missing or unusable.
 */
export function retryAfterSecondsFromHeader(
  value: string | null | undefined,
): number {
  if (!value) return RATE_LIMIT_WAIT_DEFAULT_SECONDS;
  const trimmed = value.trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return clampRateLimitWaitSeconds(Number(trimmed));
  }
  const when = Date.parse(trimmed);
  if (!Number.isNaN(when)) {
    return clampRateLimitWaitSeconds((when - Date.now()) / 1000);
  }
  return RATE_LIMIT_WAIT_DEFAULT_SECONDS;
}
