import { generateText } from "ai";
import {
  ClueGenerateError,
  classifyLlmError,
  messageForClueCode,
} from "@/lib/ai/errors";
import { getNvidiaLanguageModel } from "@/lib/ai/nvidia";
import { MAX_ANSWER_LENGTH, MIN_ANSWER_LENGTH } from "@/lib/clues/limits";
import { answersConflict, normalizeClues, preferAnswer } from "@/lib/clues/normalize";
import { clueCandidateSchema } from "@/lib/clues/schema";
import type { ClueCandidate } from "@/lib/crossword/types";

const LLM_TIMEOUT_MS = 45_000;

export type GenerateClueOptions = {
  /** Answers the model must not reuse. */
  exclude?: string[];
  /** How many new clues to request. */
  count?: number;
  /** Abort stream early once we have this many new clues. */
  softStop?: number;
};

function buildPrompt(
  topic: string,
  notes: string,
  count: number,
  exclude: string[],
): string {
  const notesBlock = notes
    ? `\nGrounding notes from the user (prefer these facts):\n${notes}\n`
    : "";

  const excludeBlock =
    exclude.length > 0
      ? `\nDo NOT use any of these answers (already used):\n${exclude.join(", ")}\n`
      : "";

  return `Generate crossword clue entries for a themed puzzle.

Topic: ${topic}
${notesBlock}${excludeBlock}
Output format — STRICT:
- Return ONLY JSON: either newline-delimited objects (NDJSON) or a JSON array.
- One clue object per line or array item. No markdown fences. No commentary.
- Exactly this shape: {"answer":"WORD","clue":"short clue"}

Rules:
- Emit ${count} lines as fast as possible.
- answer: letters A-Z only after dropping spaces/punctuation, length ${MIN_ANSWER_LENGTH}-${MAX_ANSWER_LENGTH}.
- Multi-word titles: concatenate ALL words with no spaces (OLDTOWNROAD, UPTOWNFUNK, BRIDGEFOUR).
  Never drop a word or syllable to shorten (not OLDTOWN, not UPTOFUNK).
- If the full letters-only title/name is longer than ${MAX_ANSWER_LENGTH}, SKIP that entry.
  Never truncate, nickname, abbreviate, or respell to fit.
- Use correct standard spellings only. No phonetic/slang forms
  (THUNDER not THUNDA; DYNAMITE not DYNAMIT; SHALLOW not SHALOW).
- Answers must be primary entities of the topic. For song/chart topics: song titles —
  not fan nicknames (not BELIEBER), not artists unless the topic is artists.
- clue: max 50 characters, crossword-style; avoid major spoilers.
- Tightly related to the topic.
- No duplicate or near-duplicate answers for the same work under different spellings
  (not both DESPACITO and DESPA; not both SHALLOW and SHALOW).
- Keep FULL proper nouns and names (OPPENHEIMER not OPPEN; KALADIN not KAL).
- Start emitting lines immediately. No preamble.`;
}

function parseClueObject(raw: unknown): ClueCandidate | null {
  const parsed = clueCandidateSchema.safeParse(raw);
  if (!parsed.success) return null;
  const [normalized] = normalizeClues([parsed.data]);
  return normalized ?? null;
}

export function extractObjectsFromText(text: string): ClueCandidate[] {
  const cleaned = text.replace(/```(?:json)?/gi, "");
  const out: ClueCandidate[] = [];
  const seen = new Set<string>();
  let i = 0;

  while (i < cleaned.length) {
    if (cleaned[i] !== "{") {
      i += 1;
      continue;
    }

    let depth = 0;
    let inString = false;
    let escaped = false;
    let end = -1;

    for (let j = i; j < cleaned.length; j++) {
      const ch = cleaned[j]!;
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (ch === "\\") {
          escaped = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      }

      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === "{") depth += 1;
      if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          end = j;
          break;
        }
      }
    }

    if (end === -1) break;

    const slice = cleaned.slice(i, end + 1);
    i = end + 1;

    try {
      const raw = JSON.parse(slice) as unknown;
      if (
        raw &&
        typeof raw === "object" &&
        !Array.isArray(raw) &&
        "clues" in (raw as object)
      ) {
        const nested = (raw as { clues: unknown }).clues;
        if (Array.isArray(nested)) {
          for (const item of nested) {
            const clue = parseClueObject(item);
            if (!clue || seen.has(clue.answer)) continue;
            seen.add(clue.answer);
            out.push(clue);
          }
        }
        continue;
      }

      const clue = parseClueObject(raw);
      if (!clue || seen.has(clue.answer)) continue;
      seen.add(clue.answer);
      out.push(clue);
    } catch {
      // keep scanning
    }
  }

  if (out.length === 0) {
    const startArr = cleaned.indexOf("[");
    const endArr = cleaned.lastIndexOf("]");
    if (startArr !== -1 && endArr > startArr) {
      try {
        const arr = JSON.parse(cleaned.slice(startArr, endArr + 1)) as unknown;
        if (Array.isArray(arr)) {
          for (const item of arr) {
            const clue = parseClueObject(item);
            if (!clue || seen.has(clue.answer)) continue;
            seen.add(clue.answer);
            out.push(clue);
          }
        }
      } catch {
        // ignore
      }
    }
  }

  return out;
}

export function mergeClues(
  into: ClueCandidate[],
  seen: Set<string>,
  next: ClueCandidate[],
  exclude: Set<string>,
): void {
  for (const clue of next) {
    if (exclude.has(clue.answer) || seen.has(clue.answer)) continue;
    if ([...exclude].some((existing) => answersConflict(clue.answer, existing))) {
      continue;
    }

    const conflictIndex = into.findIndex((existing) =>
      answersConflict(clue.answer, existing.answer),
    );
    if (conflictIndex === -1) {
      seen.add(clue.answer);
      into.push(clue);
      continue;
    }

    const current = into[conflictIndex]!;
    const winner = preferAnswer(current, clue);
    if (winner.answer === current.answer) continue;
    seen.delete(current.answer);
    seen.add(winner.answer);
    into[conflictIndex] = winner;
  }
}

export type GenerateClueResult = {
  clues: ClueCandidate[];
  timedOut: boolean;
};

/**
 * One NVIDIA call per request. Do not retry 429s — that burns the same quota.
 */
export async function generateClueBank(
  topic: string,
  notes: string,
  options: GenerateClueOptions = {},
): Promise<GenerateClueResult> {
  const excludeList = normalizeClues(
    (options.exclude ?? []).map((answer) => ({ answer, clue: answer })),
  ).map((c) => c.answer);
  const exclude = new Set(excludeList);

  const count = options.count ?? 30;
  const softStop = options.softStop ?? count;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  try {
    const result = await generateText({
      model: getNvidiaLanguageModel(),
      prompt: buildPrompt(topic, notes, count, excludeList),
      temperature: 0.4,
      maxOutputTokens: Math.max(3200, 80 * count),
      abortSignal: controller.signal,
    });

    const collected: ClueCandidate[] = [];
    const seen = new Set<string>();
    mergeClues(
      collected,
      seen,
      extractObjectsFromText(result.text ?? ""),
      exclude,
    );

    const clues = normalizeClues(collected).slice(0, Math.max(softStop, count));
    if (clues.length > 0) {
      return { clues, timedOut: false };
    }

    throw new ClueGenerateError("empty", messageForClueCode("empty"));
  } catch (error) {
    if (error instanceof ClueGenerateError) throw error;
    const code = classifyLlmError(error);
    throw new ClueGenerateError(code, messageForClueCode(code));
  } finally {
    clearTimeout(timeout);
  }
}
