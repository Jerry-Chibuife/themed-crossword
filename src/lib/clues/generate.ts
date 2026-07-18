import { streamText } from "ai";
import { MIN_PUZZLE_WORDS } from "@/lib/api/schemas";
import { getNvidiaLanguageModel } from "@/lib/ai/nvidia";
import { normalizeClues } from "@/lib/clues/normalize";
import { clueCandidateSchema } from "@/lib/clues/schema";
import type { ClueCandidate } from "@/lib/crossword/types";

/** Absolute ceiling for the clues function. */
const LLM_TIMEOUT_MS = 52_000;
/** Ask the model for this many entries. */
const REQUEST_CLUE_COUNT = 22;
/**
 * Hard minimum to return success — enough for a 15-word puzzle.
 * Soft stop aborts early once we have packing headroom.
 */
const MIN_ACCEPT = MIN_PUZZLE_WORDS;
const SOFT_STOP = 20;

function buildPrompt(topic: string, notes: string): string {
  const notesBlock = notes
    ? `\nGrounding notes from the user (prefer these facts):\n${notes}\n`
    : "";

  return `Generate crossword clue entries for a themed puzzle.

Topic: ${topic}
${notesBlock}
Output format — STRICT:
- Return ONLY newline-delimited JSON (NDJSON).
- One clue object per line. No array wrapper. No markdown fences. No commentary.
- Exactly this shape per line: {"answer":"WORD","clue":"short clue"}

Rules:
- Emit ${REQUEST_CLUE_COUNT} lines as fast as possible.
- answer: letters A-Z only after dropping spaces/punctuation, length 3-12.
- Prefer single words; multi-word phrases omit spaces (e.g. BRIDGEFOUR).
- clue: max 50 characters, crossword-style; avoid major spoilers.
- Tightly related to the topic.
- No duplicate answers — every answer string must be unique.
- Prefer mid-length answers (4-8 letters).
- Start emitting lines immediately. No preamble.`;
}

function parseClueObject(raw: unknown): ClueCandidate | null {
  const parsed = clueCandidateSchema.safeParse(raw);
  if (!parsed.success) return null;
  const [normalized] = normalizeClues([parsed.data]);
  return normalized ?? null;
}

/** Pull every top-level `{...}` object from text (NDJSON or messy model output). */
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
      // Skip wrapper objects like {"clues":[...]}
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

  // Array fallback: {"clues":[...]} or [{...}, ...]
  if (out.length < MIN_ACCEPT) {
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
): void {
  for (const clue of next) {
    if (seen.has(clue.answer)) continue;
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

/**
 * Stream clues from NVIDIA and accept as soon as we have enough unique answers.
 * Tolerates NDJSON or messy JSON; soft-stops at SOFT_STOP, requires MIN_ACCEPT.
 */
export async function generateClueBank(
  topic: string,
  notes: string,
): Promise<ClueCandidate[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  const collected: ClueCandidate[] = [];
  const seen = new Set<string>();
  let buffer = "";
  let reachedSoftStop = false;

  try {
    const result = streamText({
      model: getNvidiaLanguageModel(),
      prompt: buildPrompt(topic, notes),
      temperature: 0.4,
      maxOutputTokens: 1200,
      abortSignal: controller.signal,
    });

    for await (const chunk of result.textStream) {
      buffer += chunk;
      mergeClues(collected, seen, extractObjectsFromText(buffer));

      if (collected.length >= SOFT_STOP) {
        reachedSoftStop = true;
        controller.abort();
        break;
      }
    }

    mergeClues(collected, seen, extractObjectsFromText(buffer));
  } catch (error) {
    mergeClues(collected, seen, extractObjectsFromText(buffer));

    if (reachedSoftStop || collected.length >= MIN_ACCEPT) {
      // Success path — early abort or timeout after we cleared the floor.
    } else if (isAbortError(error)) {
      throw new Error(
        `Clue generation timed out with only ${collected.length} clues (need ${MIN_ACCEPT}). Try again.`,
      );
    } else {
      throw error instanceof Error
        ? error
        : new Error("Failed to generate clues");
    }
  } finally {
    clearTimeout(timeout);
  }

  if (collected.length < MIN_ACCEPT) {
    throw new Error(
      `Only ${collected.length} valid clues generated (need ${MIN_ACCEPT}). Try again.`,
    );
  }

  return collected;
}
