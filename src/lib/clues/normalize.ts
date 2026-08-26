import {
  MAX_ANSWER_LENGTH,
  MIN_ANSWER_LENGTH,
} from "@/lib/clues/limits";
import type { ClueCandidate } from "@/lib/crossword/types";

export function lettersOnly(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z]/g, "");
}

function uniqueLetterScore(answer: string): number {
  return new Set(answer).size;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j]! + 1,
        curr[j - 1]! + 1,
        prev[j - 1]! + cost,
      );
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j]!;
  }

  return prev[b.length]!;
}

/**
 * True when two answers are the same work under truncation or near-miss spelling.
 * Prefix collisions require a stem of at least 5 letters so short unrelated
 * prefixes (e.g. CAT / CATALYST, STAR / START) do not wipe distinct entries.
 */
export function answersConflict(a: string, b: string): boolean {
  if (a === b) return true;

  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;

  if (shorter.length >= 5 && longer.startsWith(shorter)) {
    return true;
  }

  if (shorter.length >= 5 && levenshtein(a, b) <= 2) return true;

  return false;
}

function preferAnswer(a: ClueCandidate, b: ClueCandidate): ClueCandidate {
  if (a.answer.length !== b.answer.length) {
    return a.answer.length >= b.answer.length ? a : b;
  }
  if (uniqueLetterScore(a.answer) !== uniqueLetterScore(b.answer)) {
    return uniqueLetterScore(a.answer) >= uniqueLetterScore(b.answer)
      ? a
      : b;
  }
  return a;
}

/**
 * Normalize LLM / fixture answers into packer-ready candidates.
 * Drops over-length answers (never truncates) and near-duplicates.
 */
export function normalizeClues(raw: ClueCandidate[]): ClueCandidate[] {
  const exact = new Map<string, ClueCandidate>();

  for (const item of raw) {
    const answer = lettersOnly(item.answer);
    if (answer.length < MIN_ANSWER_LENGTH || answer.length > MAX_ANSWER_LENGTH) {
      continue;
    }

    const clue = item.clue.trim().replace(/\s+/g, " ").slice(0, 80);
    if (!clue) continue;

    const candidate = { answer, clue };
    const existing = exact.get(answer);
    if (!existing) {
      exact.set(answer, candidate);
    }
  }

  const candidates = [...exact.values()].sort((a, b) => {
    if (b.answer.length !== a.answer.length) {
      return b.answer.length - a.answer.length;
    }
    return uniqueLetterScore(b.answer) - uniqueLetterScore(a.answer);
  });

  const kept: ClueCandidate[] = [];
  for (const candidate of candidates) {
    const conflictIndex = kept.findIndex((k) =>
      answersConflict(candidate.answer, k.answer),
    );
    if (conflictIndex === -1) {
      kept.push(candidate);
      continue;
    }
    kept[conflictIndex] = preferAnswer(kept[conflictIndex]!, candidate);
  }

  kept.sort((a, b) => {
    if (uniqueLetterScore(b.answer) !== uniqueLetterScore(a.answer)) {
      return uniqueLetterScore(b.answer) - uniqueLetterScore(a.answer);
    }
    return b.answer.length - a.answer.length;
  });

  return kept;
}
