import { MIN_PUZZLE_WORDS, difficultyParams } from "@/lib/api/schemas";
import { packCrossword } from "@/lib/crossword/packer";
import type { ClueCandidate, Puzzle } from "@/lib/crossword/types";

function placedCount(puzzle: Puzzle): number {
  return puzzle.clues.across.length + puzzle.clues.down.length;
}

function hasUniqueAnswers(puzzle: Puzzle): boolean {
  const answers = [
    ...puzzle.clues.across.map((c) => c.answer),
    ...puzzle.clues.down.map((c) => c.answer),
  ];
  return new Set(answers).size === answers.length;
}

export function packFromBank(
  topic: string,
  candidates: ClueCandidate[],
  difficulty: "easy" | "medium" | "hard" = "medium",
): Puzzle | null {
  const { minWords, size } = difficultyParams(difficulty);

  const attempts: Array<{ size: number; timeBudgetMs: number }> = [
    { size, timeBudgetMs: 3500 },
    { size: size + 2, timeBudgetMs: 4000 },
    { size: Math.max(size, 19), timeBudgetMs: 4500 },
  ];

  for (const attempt of attempts) {
    const puzzle = packCrossword(topic, candidates, {
      size: attempt.size,
      minWords,
      timeBudgetMs: attempt.timeBudgetMs,
    });

    if (
      puzzle &&
      placedCount(puzzle) >= MIN_PUZZLE_WORDS &&
      hasUniqueAnswers(puzzle)
    ) {
      return puzzle;
    }
  }

  return null;
}
