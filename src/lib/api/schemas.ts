import { z } from "zod";
import { clueCandidateSchema } from "@/lib/clues/schema";

export const MIN_PUZZLE_WORDS = 15;

export const topicBodySchema = z.object({
  topic: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(2000).optional().default(""),
  difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
  /** Dev/demo fallback when NVIDIA_API_KEY is missing */
  useFixture: z.boolean().optional().default(false),
});

export const packBodySchema = z.object({
  topic: z.string().trim().min(1).max(120),
  difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
  clues: z.array(clueCandidateSchema).min(MIN_PUZZLE_WORDS).max(40),
});

export function difficultyParams(difficulty: "easy" | "medium" | "hard") {
  // Always at least 15 playable entries; harder → denser grid target.
  const minWords = Math.max(
    MIN_PUZZLE_WORDS,
    difficulty === "hard" ? 18 : MIN_PUZZLE_WORDS,
  );
  const size = difficulty === "easy" ? 15 : difficulty === "hard" ? 19 : 17;
  return { minWords, size };
}
