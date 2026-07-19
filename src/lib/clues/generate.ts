import { streamText } from "ai";
import { getNvidiaLanguageModel } from "@/lib/ai/nvidia";
import { normalizeClues } from "@/lib/clues/normalize";
import { clueCandidateSchema } from "@/lib/clues/schema";
import type { ClueCandidate } from "@/lib/crossword/types";

const LLM_TIMEOUT_MS = 52_000;

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
- Return ONLY newline-delimited JSON (NDJSON).
- One clue object per line. No array wrapper. No markdown fences. No commentary.
- Exactly this shape per line: {"answer":"WORD","clue":"short clue"}

Rules:
- Emit ${count} lines as fast as possible.
- answer: letters A-Z only after dropping spaces/punctuation, length 3-15.
- Prefer single words; multi-word phrases omit spaces (e.g. BRIDGEFOUR).
- clue: max 50 characters, crossword-style; avoid major spoilers.
- Tightly related to the topic.
- No duplicate answers — every answer string must be unique.
- Keep FULL proper nouns and names. Never truncate or nickname them
  (use OPPENHEIMER not OPPEN; KALADIN not KAL; DALINAR not DAL).
- Do not invent abbreviations of real names just to make answers shorter.
- Mid-length common nouns are fine; names must stay complete within 15 letters.
- Start emitting lines immediately. No preamble.`;
}

function parseClueObject(raw: unknown): ClueCandidate | null {
  const parsed = clueCandidateSchema.safeParse(raw);
  if (!parsed.success) return null;
  const [normalized] = normalizeClues([parsed.data]);
  return normalized ?? null;
}

function extractObjectsFromText(text: string): ClueCandidate[] {
  const out: ClueCandidate[] = [];
  const seen = new Set<string>();
  let i = 0;

  while (i < text.length) {
    if (text[i] !== "{") {
      i += 1;
      continue;
    }

    let depth = 0;
    let inString = false;
    let escaped = false;
    let end = -1;

    for (let j = i; j < text.length; j++) {
      const ch = text[j]!;
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

    const slice = text.slice(i, end + 1);
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
    const startArr = text.indexOf("[");
    const endArr = text.lastIndexOf("]");
    if (startArr !== -1 && endArr > startArr) {
      try {
        const arr = JSON.parse(text.slice(startArr, endArr + 1)) as unknown;
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

function mergeClues(
  into: ClueCandidate[],
  seen: Set<string>,
  next: ClueCandidate[],
  exclude: Set<string>,
): void {
  for (const clue of next) {
    if (exclude.has(clue.answer) || seen.has(clue.answer)) continue;
    seen.add(clue.answer);
    into.push(clue);
  }
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" ||
      error.name === "TimeoutError" ||
      /abort/i.test(error.message))
  );
}

export type GenerateClueResult = {
  clues: ClueCandidate[];
  timedOut: boolean;
};

/**
 * Stream clues from NVIDIA. Returns whatever unique new clues we got —
 * including a partial batch on timeout — so the client can top up.
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

  const count = options.count ?? 20;
  const softStop = options.softStop ?? Math.min(count, 18);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  const collected: ClueCandidate[] = [];
  const seen = new Set<string>();
  let buffer = "";
  let timedOut = false;
  let reachedSoftStop = false;

  try {
    const result = streamText({
      model: getNvidiaLanguageModel(),
      prompt: buildPrompt(topic, notes, count, excludeList),
      temperature: 0.4,
      maxOutputTokens: Math.min(1200, 80 * count),
      abortSignal: controller.signal,
    });

    for await (const chunk of result.textStream) {
      buffer += chunk;
      mergeClues(
        collected,
        seen,
        extractObjectsFromText(buffer),
        exclude,
      );

      if (collected.length >= softStop) {
        reachedSoftStop = true;
        controller.abort();
        break;
      }
    }

    mergeClues(collected, seen, extractObjectsFromText(buffer), exclude);
  } catch (error) {
    mergeClues(collected, seen, extractObjectsFromText(buffer), exclude);

    if (reachedSoftStop) {
      // intentional early stop
    } else if (isAbortError(error)) {
      timedOut = true;
    } else if (collected.length === 0) {
      throw error instanceof Error
        ? error
        : new Error("Failed to generate clues");
    } else {
      // Non-abort error but we have some clues — return partial.
      timedOut = true;
    }
  } finally {
    clearTimeout(timeout);
  }

  return { clues: collected, timedOut };
}
