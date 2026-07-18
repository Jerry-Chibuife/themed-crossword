import { generateText } from "ai";
import { getNvidiaLanguageModel } from "@/lib/ai/nvidia";
import { normalizeClues } from "@/lib/clues/normalize";
import { clueBankSchema } from "@/lib/clues/schema";
import type { ClueCandidate } from "@/lib/crossword/types";

/** Hard stop so the clues function finishes under Vercel’s 60s cap. */
const LLM_TIMEOUT_MS = 45_000;
const TARGET_CLUE_COUNT = 20;

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object in model response");
  }
  return JSON.parse(candidate.slice(start, end + 1)) as unknown;
}

function buildPrompt(topic: string, notes: string): string {
  const notesBlock = notes
    ? `\nGrounding notes from the user (prefer these facts):\n${notes}\n`
    : "";

  return `You generate crossword clue banks for a themed puzzle.

Topic: ${topic}
${notesBlock}
Return ONLY valid JSON with this exact shape:
{"clues":[{"answer":"WORD","clue":"short clue text"}, ...]}

Rules:
- Provide exactly ${TARGET_CLUE_COUNT} clue objects (no more).
- "answer" must be letters A-Z only after dropping spaces/punctuation, length 3-12.
- Prefer single words; multi-word phrases may omit spaces (e.g. BRIDGEFOUR).
- "clue" max 60 characters, crossword-style; avoid major spoilers for fiction.
- Answers must be tightly related to the topic.
- No duplicate answers.
- Prefer mid-length answers (4-8 letters) with varied letters.
- Do not include chain-of-thought; output JSON only.`;
}

export async function generateClueBank(
  topic: string,
  notes: string,
): Promise<ClueCandidate[]> {
  const { text } = await generateText({
    model: getNvidiaLanguageModel(),
    prompt: buildPrompt(topic, notes),
    temperature: 0.4,
    maxOutputTokens: 1000,
    abortSignal: AbortSignal.timeout(LLM_TIMEOUT_MS),
  });

  let parsed: unknown;
  try {
    parsed = extractJsonObject(text);
  } catch {
    throw new Error(
      "Model returned invalid JSON. Try again with a shorter topic.",
    );
  }

  const bank = clueBankSchema.parse(parsed);
  const clues = normalizeClues(bank.clues);

  if (clues.length < 12) {
    throw new Error(`Only ${clues.length} valid clues after normalize`);
  }

  return clues;
}
