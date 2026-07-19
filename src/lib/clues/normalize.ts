import {
  MAX_ANSWER_LENGTH,
  MIN_ANSWER_LENGTH,
} from "@/lib/clues/limits";
import type { ClueCandidate } from "@/lib/crossword/types";

function lettersOnly(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z]/g, "");
}

function uniqueLetterScore(answer: string): number {
  return new Set(answer).size;
}

/**
 * Normalize LLM / fixture answers into packer-ready candidates.
 */
export function normalizeClues(raw: ClueCandidate[]): ClueCandidate[] {
  const seen = new Set<string>();
  const out: ClueCandidate[] = [];

  for (const item of raw) {
    const answer = lettersOnly(item.answer);
    if (answer.length < MIN_ANSWER_LENGTH || answer.length > MAX_ANSWER_LENGTH) {
      continue;
    }
    if (seen.has(answer)) continue;
    seen.add(answer);

    const clue = item.clue.trim().replace(/\s+/g, " ").slice(0, 80);
    if (!clue) continue;

    out.push({ answer, clue });
  }

  out.sort((a, b) => {
    // Prefer variety / packability, but do not bias against full-length names.
    if (uniqueLetterScore(b.answer) !== uniqueLetterScore(a.answer)) {
      return uniqueLetterScore(b.answer) - uniqueLetterScore(a.answer);
    }
    return b.answer.length - a.answer.length;
  });

  return out;
}
