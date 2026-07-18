import { generateText } from "ai";
import { getNvidiaLanguageModel } from "@/lib/ai/nvidia";
import { normalizeClues } from "@/lib/clues/normalize";
import { clueBankSchema } from "@/lib/clues/schema";
import type { ClueCandidate } from "@/lib/crossword/types";

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

function buildPrompt(topic: string, notes: string, repairHint?: string): string {
  const notesBlock = notes
    ? `\nGrounding notes from the user (prefer these facts):\n${notes}\n`
    : "";

  return `You generate crossword clue banks for a themed puzzle.

Topic: ${topic}
${notesBlock}
Return ONLY valid JSON with this exact shape:
{"clues":[{"answer":"WORD","clue":"short clue text"}, ...]}

Rules:
- Provide 45-60 clue objects.
- "answer" must be a single crossword entry: letters A-Z only after normalization, length 3-12. Prefer single words; multi-word phrases may omit spaces (e.g. BRIDGEFOUR).
- "clue" max 80 characters, crossword-style, no spoilers for major plot twists when the topic is fiction.
- Answers must be tightly related to the topic.
- No duplicate answers.
- Prefer mid-length answers (4-8 letters) with varied letters for interlocking.
${repairHint ? `\nPrevious output was invalid: ${repairHint}. Fix and return JSON only.` : ""}`;
}

async function requestClueBank(
  topic: string,
  notes: string,
  repairHint?: string,
): Promise<ClueCandidate[]> {
  const { text } = await generateText({
    model: getNvidiaLanguageModel(),
    prompt: buildPrompt(topic, notes, repairHint),
    temperature: 0.7,
    maxOutputTokens: 4096,
  });

  const parsed = extractJsonObject(text);
  const bank = clueBankSchema.parse(parsed);
  return normalizeClues(bank.clues);
}

export async function generateClueBank(
  topic: string,
  notes: string,
): Promise<ClueCandidate[]> {
  try {
    const clues = await requestClueBank(topic, notes);
    if (clues.length < 12) {
      throw new Error(`Only ${clues.length} valid clues after normalize`);
    }
    return clues;
  } catch (error) {
    const hint = error instanceof Error ? error.message : "invalid response";
    const clues = await requestClueBank(topic, notes, hint);
    if (clues.length < 12) {
      throw new Error("Clue bank too small after repair");
    }
    return clues;
  }
}
