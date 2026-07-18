import { streamText } from "ai";
import { getNvidiaLanguageModel } from "@/lib/ai/nvidia";
import { normalizeClues } from "@/lib/clues/normalize";
import { clueCandidateSchema } from "@/lib/clues/schema";
import type { ClueCandidate } from "@/lib/crossword/types";

/** Absolute ceiling for the clues function. */
const LLM_TIMEOUT_MS = 50_000;
/** Ask the model for this many lines. */
const REQUEST_CLUE_COUNT = 16;
/** Stop streaming as soon as we have this many valid clues. */
const MIN_CLUES = 12;

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
- Tightly related to the topic; no duplicate answers.
- Prefer mid-length answers (4-8 letters).
- Start emitting lines immediately. No preamble.`;
}

function parseClueLine(line: string): ClueCandidate | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed[0] !== "{") return null;

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  try {
    const raw = JSON.parse(trimmed.slice(start, end + 1)) as unknown;
    const parsed = clueCandidateSchema.safeParse(raw);
    if (!parsed.success) return null;
    const [normalized] = normalizeClues([parsed.data]);
    return normalized ?? null;
  } catch {
    return null;
  }
}

function extractCluesFromBuffer(buffer: string): {
  clues: ClueCandidate[];
  rest: string;
} {
  const lines = buffer.split("\n");
  const rest = lines.pop() ?? "";
  const seen = new Set<string>();
  const clues: ClueCandidate[] = [];

  for (const line of lines) {
    const clue = parseClueLine(line);
    if (!clue || seen.has(clue.answer)) continue;
    seen.add(clue.answer);
    clues.push(clue);
  }

  return { clues, rest };
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
 * Stream NDJSON clues from NVIDIA and abort early once we have enough.
 * Waiting for a full JSON blob was timing out on Vercel’s 60s limit.
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
  let reachedMin = false;

  try {
    const result = streamText({
      model: getNvidiaLanguageModel(),
      prompt: buildPrompt(topic, notes),
      temperature: 0.4,
      maxOutputTokens: 900,
      abortSignal: controller.signal,
    });

    for await (const chunk of result.textStream) {
      buffer += chunk;
      const { clues, rest } = extractCluesFromBuffer(buffer);
      buffer = rest;

      for (const clue of clues) {
        if (seen.has(clue.answer)) continue;
        seen.add(clue.answer);
        collected.push(clue);
      }

      if (collected.length >= MIN_CLUES) {
        reachedMin = true;
        controller.abort();
        break;
      }
    }

    if (collected.length < MIN_CLUES && buffer.trim()) {
      const clue = parseClueLine(buffer);
      if (clue && !seen.has(clue.answer)) {
        collected.push(clue);
      }
    }
  } catch (error) {
    // Early abort after MIN_CLUES is success; timeout with too few clues is failure.
    if (reachedMin || collected.length >= MIN_CLUES) {
      // keep collected
    } else if (isAbortError(error)) {
      throw new Error(
        `Clue generation timed out with only ${collected.length} clues. Try again.`,
      );
    } else {
      throw error instanceof Error
        ? error
        : new Error("Failed to generate clues");
    }
  } finally {
    clearTimeout(timeout);
  }

  if (collected.length < MIN_CLUES) {
    throw new Error(
      `Only ${collected.length} valid clues generated (need ${MIN_CLUES}). Try again.`,
    );
  }

  return collected;
}
