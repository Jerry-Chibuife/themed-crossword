import { z } from "zod";
import { clueCandidateSchema } from "@/lib/clues/schema";

/**
 * FROZEN generate architecture. Do not change these values or the
 * small-batch / wait-then-retry loop unless explicitly requested.
 *
 * One Generate: the client calls POST /api/clues repeatedly for
 * CLUE_BATCH_SIZE new clues, aggregates until MIN_PUZZLE_WORDS, and on
 * NVIDIA 429/503 tells the user, waits retry-after (or a default), then
 * retries that same batch. The server never auto-retries 429s.
 */
export const MIN_PUZZLE_WORDS = 24;
export const CLUE_BATCH_SIZE = 6;
/** Safety cap on successful /api/clues rounds in one Generate (24/6 = 4, plus dups). */
export const MAX_CLUE_BATCHES = 8;
/** Max wait-and-retry cycles for 429/503 inside one Generate. */
export const MAX_RATE_LIMIT_WAITS = 5;
export const RATE_LIMIT_WAIT_DEFAULT_SECONDS = 8;
export const RATE_LIMIT_WAIT_MIN_SECONDS = 2;
export const RATE_LIMIT_WAIT_MAX_SECONDS = 30;
/** Fixed grid size until difficulty settings land. */
export const PUZZLE_GRID_SIZE = 19;

export const WAIT_AND_RETRY_CODES = ["rate_limited", "overloaded"] as const;
export type WaitAndRetryCode = (typeof WAIT_AND_RETRY_CODES)[number];

export function isWaitAndRetryCode(code: string | undefined): code is WaitAndRetryCode {
  return (
    code === "rate_limited" ||
    code === "overloaded"
  );
}

export const topicBodySchema = z.object({
  topic: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(2000).optional().default(""),
  difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
  /** Dev/demo fallback when NVIDIA_API_KEY is missing */
  useFixture: z.boolean().optional().default(false),
  /** Answers already collected — model must not repeat these. */
  exclude: z.array(z.string().trim().max(24)).max(50).optional().default([]),
  /** How many new clues to aim for in this call. Frozen batch size is CLUE_BATCH_SIZE. */
  count: z.number().int().min(4).max(12).optional(),
});

export const packBodySchema = z.object({
  topic: z.string().trim().min(1).max(120),
  difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
  clues: z.array(clueCandidateSchema).min(MIN_PUZZLE_WORDS).max(50),
});

export function difficultyParams(_difficulty: "easy" | "medium" | "hard") {
  // Difficulty UI comes later; every pack uses a fixed 19×19 with min 24 words.
  return { minWords: MIN_PUZZLE_WORDS, size: PUZZLE_GRID_SIZE };
}
