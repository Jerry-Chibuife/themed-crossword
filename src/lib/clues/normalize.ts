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
    if (answer.length < 3 || answer.length > 12) continue;
    if (seen.has(answer)) continue;
    seen.add(answer);

    const clue = item.clue.trim().replace(/\s+/g, " ").slice(0, 80);
    if (!clue) continue;

    out.push({ answer, clue });
  }

  out.sort((a, b) => {
    const aMid = a.answer.length >= 4 && a.answer.length <= 8 ? 1 : 0;
    const bMid = b.answer.length >= 4 && b.answer.length <= 8 ? 1 : 0;
    if (bMid !== aMid) return bMid - aMid;
    if (uniqueLetterScore(b.answer) !== uniqueLetterScore(a.answer)) {
      return uniqueLetterScore(b.answer) - uniqueLetterScore(a.answer);
    }
    return b.answer.length - a.answer.length;
  });

  return out;
}
