import { z } from "zod";

export const clueCandidateSchema = z.object({
  answer: z.string().min(1).max(64),
  clue: z.string().min(1).max(120),
});

export const clueBankSchema = z.object({
  clues: z.array(clueCandidateSchema).min(10).max(80),
});

export type ClueBank = z.infer<typeof clueBankSchema>;