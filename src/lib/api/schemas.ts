import { z } from "zod";
import { clueCandidateSchema } from "@/lib/clues/schema";

export const MIN_PUZZLE_WORDS = 24;
/** Max extra /api/clues rounds after the first (client-driven). */
export const MAX_CLUE_TOPUPS = 3;
/** Fixed grid size until difficulty settings land. */
export const PUZZLE_GRID_SIZE = 19;

export const topicBodySchema = z.object({
  topic: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(2000).optional().default(""),
  difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
  /** Dev/demo fallback when NVIDIA_API_KEY is missing */
  useFixture: z.boolean().optional().default(false),
  /** Answers already collected — model must not repeat these. */
  exclude: z.array(z.string().trim().max(20)).max(50).optional().default([]),
  /** How many new clues to aim for in this call. */
  count: z.number().int().min(4).max(36).optional(),
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
