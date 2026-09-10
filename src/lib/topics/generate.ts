import { generateText } from "ai";
import { getNvidiaLanguageModel } from "@/lib/ai/nvidia";
import {
  TOPIC_CATEGORIES,
  topicSparkSchema,
  type TopicSpark,
} from "@/lib/topics/types";

const TOPIC_TIMEOUT_MS = 22_000;

function buildPrompt(): string {
  const cats = TOPIC_CATEGORIES.join(", ");
  const count = TOPIC_CATEGORIES.length;
  return `Generate exactly ${count} crossword topic ideas for a themed puzzle app.

Return ONLY a JSON array of ${count} objects. No markdown. No commentary.
Each object shape: {"label":"...","category":"...","hook":"..."}

Categories (exactly one spark per category, in any order): ${cats}

Rules:
- label: catchy, specific, enticing; 3-40 characters. Not generic ("Movies", "History").
- Prefer entity-rich themes (names, titles, places, terms) that can fill a 15-word crossword.
- hook: one short tease, max 60 characters, optional grounding for clue generation.
- Keep it fun and bold. No NSFW, no hate, no harassment of living private individuals.
- Make the ${count} labels feel distinct from each other.

Example labels: "Olympic villains & underdogs", "Stormlight Archive names", "Afrobeats heavyweights".`;
}

function extractJsonArray(text: string): unknown {
  const trimmed = text.trim();
  const start = trimmed.indexOf("[");
  const end = trimmed.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON array in topic response");
  }
  return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
}

function normalizeSparks(raw: unknown): TopicSpark[] {
  if (!Array.isArray(raw)) throw new Error("Topics payload is not an array");

  const byCategory = new Map<string, TopicSpark>();
  for (const item of raw) {
    const parsed = topicSparkSchema.safeParse(item);
    if (!parsed.success) continue;
    if (!byCategory.has(parsed.data.category)) {
      byCategory.set(parsed.data.category, parsed.data);
    }
  }

  const sparks = TOPIC_CATEGORIES.map((category) => byCategory.get(category));
  if (sparks.some((s) => !s)) {
    throw new Error("Missing one or more topic categories");
  }
  return sparks as TopicSpark[];
}

export async function generateTopicSparks(): Promise<TopicSpark[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TOPIC_TIMEOUT_MS);

  try {
    const result = await generateText({
      model: getNvidiaLanguageModel(),
      prompt: buildPrompt(),
      temperature: 0.9,
      maxRetries: 0,
      maxOutputTokens: 1400,
      abortSignal: controller.signal,
    });

    return normalizeSparks(extractJsonArray(result.text));
  } finally {
    clearTimeout(timeout);
  }
}
