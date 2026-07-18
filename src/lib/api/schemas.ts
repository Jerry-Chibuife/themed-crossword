import { z } from "zod";
import { clueCandidateSchema } from "@/lib/clues/schema";

export const MIN_PUZZLE_WORDS = 15;
/** Max extra /api/clues rounds after the first (client-driven). */
export const MAX_CLUE_TOPUPS = 2;

export const topicBodySchema = z.object({
  topic: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(2000).optional().default(""),
  difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
  /** Dev/demo fallback when NVIDIA_API_KEY is missing */
  useFixture: z.boolean().optional().default(false),
  /** Answers already collected — model must not repeat these. */
  exclude: z.array(z.string().trim().max(16)).max(40).optional().default([]),
  /** How many new clues to aim for in this call. */
  count: z.number().int().min(4).max(28).optional(),
});

export const packBodySchema = z.object({
  topic: z.string().trim().min(1).max(120),
  difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
  clues: z.array(clueCandidateSchema).min(MIN_PUZZLE_WORDS).max(40),
});

export function difficultyParams(difficulty: "easy" | "medium" | "hard") {
  const minWords = Math.max(
    MIN_PUZZLE_WORDS,
    difficulty === "hard" ? 18 : MIN_PUZZLE_WORDS,
  );
  const size = difficulty === "easy" ? 15 : difficulty === "hard" ? 19 : 17;
  return { minWords, size };
}
