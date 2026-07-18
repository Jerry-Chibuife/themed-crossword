import type { Puzzle } from "@/lib/crossword/types";

const STORAGE_KEY = "themed-crossword:v1";

export type StoredSession = {
  puzzle: Puzzle;
  userGrid: (string | null)[];
  updatedAt: number;
};

export function loadSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed?.puzzle?.grid || !Array.isArray(parsed.userGrid)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session: StoredSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
