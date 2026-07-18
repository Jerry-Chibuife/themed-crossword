import { z } from "zod";
import { clueCandidateSchema } from "@/lib/clues/schema";

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
  clues: z.array(clueCandidateSchema).min(8).max(40),
});

export function difficultyParams(difficulty: "easy" | "medium" | "hard") {
  const minWords = difficulty === "easy" ? 6 : difficulty === "hard" ? 10 : 8;
  const size = difficulty === "easy" ? 13 : 15;
  return { minWords, size };
}
