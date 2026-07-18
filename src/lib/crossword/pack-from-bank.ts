import { packCrossword } from "@/lib/crossword/packer";
import type { ClueCandidate, Puzzle } from "@/lib/crossword/types";
import { difficultyParams } from "@/lib/api/schemas";

export function packFromBank(
  topic: string,
  candidates: ClueCandidate[],
  difficulty: "easy" | "medium" | "hard" = "medium",
): Puzzle | null {
  const { minWords, size } = difficultyParams(difficulty);

  let puzzle = packCrossword(topic, candidates, {
    size,
    minWords,
    timeBudgetMs: 2000,
  });

  if (!puzzle) {
    puzzle = packCrossword(topic, candidates, {
      size: Math.max(11, size - 2),
      minWords: Math.max(5, minWords - 2),
      timeBudgetMs: 1500,
    });
  }

  return puzzle;
}
