import type { TopicSpark } from "@/lib/topics/types";
import { topicSparksResponseSchema } from "@/lib/topics/types";

const STORAGE_KEY = "themed-crossword:sparks:v1";
const TTL_MS = 6 * 60 * 60 * 1000;

type SparksCache = {
  sparks: TopicSpark[];
  savedAt: number;
};

export function loadSparksCache(): TopicSpark[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SparksCache;
    const checked = topicSparksResponseSchema.safeParse({
      sparks: parsed.sparks,
    });
    if (!checked.success) return null;
    if (Date.now() - parsed.savedAt > TTL_MS) return null;
    return checked.data.sparks;
  } catch {
    return null;
  }
}

/** Returns cached sparks even if stale (for instant paint). */
export function loadSparksCacheStale(): TopicSpark[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SparksCache;
    const checked = topicSparksResponseSchema.safeParse({
      sparks: parsed.sparks,
    });
    if (!checked.success) return null;
    return checked.data.sparks;
  } catch {
    return null;
  }
}

export function isSparksCacheFresh(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as SparksCache;
    return Date.now() - parsed.savedAt <= TTL_MS;
  } catch {
    return false;
  }
}

export function saveSparksCache(sparks: TopicSpark[]): void {
  if (typeof window === "undefined") return;
  const payload: SparksCache = { sparks, savedAt: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}
