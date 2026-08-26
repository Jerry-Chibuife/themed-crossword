import type { TopicSpark } from "@/lib/topics/types";
import { topicSparksResponseSchema } from "@/lib/topics/types";

const TTL_MS = 20 * 60 * 1000;

type SlateCache = {
  sparks: TopicSpark[];
  savedAt: number;
};

let lastGood: SlateCache | null = null;

export function loadServerSparksCache(): TopicSpark[] | null {
  if (!lastGood) return null;
  if (Date.now() - lastGood.savedAt > TTL_MS) {
    lastGood = null;
    return null;
  }
  const checked = topicSparksResponseSchema.safeParse({
    sparks: lastGood.sparks,
  });
  if (!checked.success) {
    lastGood = null;
    return null;
  }
  return checked.data.sparks;
}

export function saveServerSparksCache(sparks: TopicSpark[]): void {
  const checked = topicSparksResponseSchema.safeParse({ sparks });
  if (!checked.success) return;
  lastGood = { sparks: checked.data.sparks, savedAt: Date.now() };
}
