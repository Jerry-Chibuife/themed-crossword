"use client";

import { useEffect, useState } from "react";
import { CrosswordPlayer } from "@/components/CrosswordPlayer";
import { GeneratingWait } from "@/components/GeneratingWait";
import { TopicForm } from "@/components/TopicForm";
import {
  clampRateLimitWaitSeconds,
  retryAfterSecondsFromHeader,
} from "@/lib/api/retry-after";
import {
  CLUE_BATCH_SIZE,
  MAX_CLUE_BATCHES,
  MAX_RATE_LIMIT_WAITS,
  MIN_PUZZLE_WORDS,
  RATE_LIMIT_WAIT_DEFAULT_SECONDS,
  TARGET_PUZZLE_WORDS,
  isWaitAndRetryCode,
} from "@/lib/api/schemas";
import { normalizeClues } from "@/lib/clues/normalize";
import type { ClueCandidate, Puzzle } from "@/lib/crossword/types";
import { clearSession, loadSession } from "@/lib/storage";

type Phase = "create" | "generating" | "play";

type CluesResponse =
  | {
      topic: string;
      clues: ClueCandidate[];
      meta?: { usedFixture?: boolean; clueCount?: number; partial?: boolean };
    }
  | {
      error: string;
      stage?: string;
      code?: string;
      retryAfterSeconds?: number;
    };

type PackResponse =
  | { puzzle: Puzzle; meta?: { placed?: number } }
  | { error: string; stage?: string };

function mergeUnique(
  existing: ClueCandidate[],
  incoming: ClueCandidate[],
): ClueCandidate[] {
  return normalizeClues([...existing, ...incoming]);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

class CluesFetchError extends Error {
  readonly code: string | undefined;
  readonly retryAfterSeconds: number;

  constructor(message: string, code?: string, retryAfterSeconds?: number) {
    super(message);
    this.name = "CluesFetchError";
    this.code = code;
    this.retryAfterSeconds = clampRateLimitWaitSeconds(
      retryAfterSeconds ?? RATE_LIMIT_WAIT_DEFAULT_SECONDS,
    );
  }
}

async function fetchClueBatch(input: {
  topic: string;
  notes: string;
  exclude: string[];
  count: number;
}): Promise<ClueCandidate[]> {
  const response = await fetch("/api/clues", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await response.json()) as CluesResponse;

  if (!response.ok || !("clues" in data)) {
    const message =
      "error" in data
        ? data.error
        : "Something went wrong gathering clues.";
    const code = "code" in data ? data.code : undefined;
    const fromBody =
      "retryAfterSeconds" in data ? data.retryAfterSeconds : undefined;
    const wait = retryAfterSecondsFromHeader(
      fromBody != null
        ? String(fromBody)
        : response.headers.get("Retry-After"),
    );
    throw new CluesFetchError(message, code, wait);
  }

  return data.clues;
}

export function AppShell() {
  const [phase, setPhase] = useState<Phase>("create");
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [userGrid, setUserGrid] = useState<(string | null)[] | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Gathering clues…");
  const [detail, setDetail] = useState("Asking the model for themed answers.");
  const [hydrated, setHydrated] = useState(false);
  const [pendingGenerate, setPendingGenerate] = useState<{
    topic: string;
    notes: string;
  } | null>(null);

  useEffect(() => {
    const session = loadSession();
    if (session) {
      setPuzzle(session.puzzle);
      setUserGrid(session.userGrid);
      setPhase("play");
    }
    setHydrated(true);
  }, []);

  async function waitForRateLimit(
    seconds: number,
    collected: number,
    reason: string,
  ): Promise<void> {
    for (let left = seconds; left >= 1; left -= 1) {
      setError(null);
      setStatus(
        reason === "overloaded" ? "NVIDIA is busy…" : "NVIDIA rate limit…",
      );
      setDetail(
        `Have ${collected} of ${TARGET_PUZZLE_WORDS} clues. Waiting ${left} second${left === 1 ? "" : "s"}, then continuing.`,
      );
      await sleep(1000);
    }
  }

  async function handleGenerate(values: { topic: string; notes: string }) {
    setError(null);
    setPendingGenerate(values);
    setPhase("generating");
    setStatus("Gathering clues…");
    setDetail("Asking the model for themed answers.");

    try {
      let clues: ClueCandidate[] = [];
      let batches = 0;
      let waits = 0;

      // Small batches until TARGET_PUZZLE_WORDS. Do not collapse into
      // one large NVIDIA call. 429/503 wait-then-retry here, not in the SDK.
      while (
        clues.length < TARGET_PUZZLE_WORDS &&
        batches < MAX_CLUE_BATCHES
      ) {
        const needed = TARGET_PUZZLE_WORDS - clues.length;
        const count = Math.min(CLUE_BATCH_SIZE, Math.max(needed, 4));

        setStatus("Gathering clues…");
        setDetail(
          `Have ${clues.length} of ${TARGET_PUZZLE_WORDS} — requesting ${count} more.`,
        );

        try {
          const batch = await fetchClueBatch({
            topic: values.topic,
            notes: values.notes,
            exclude: clues.map((c) => c.answer),
            count,
          });
          batches += 1;
          const before = clues.length;
          clues = mergeUnique(clues, batch);
          if (clues.length === before) break;
        } catch (err) {
          if (
            err instanceof CluesFetchError &&
            isWaitAndRetryCode(err.code) &&
            waits < MAX_RATE_LIMIT_WAITS
          ) {
            waits += 1;
            await waitForRateLimit(
              err.retryAfterSeconds,
              clues.length,
              err.code,
            );
            continue;
          }
          throw err;
        }
      }

      if (clues.length < MIN_PUZZLE_WORDS) {
        throw new Error(
          `Only collected ${clues.length} unique clues (need ${MIN_PUZZLE_WORDS}). Try again.`,
        );
      }

      setStatus("Building grid…");
      setDetail("Fitting answers into an interlocking grid.");

      const packRes = await fetch("/api/pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: values.topic,
          clues,
          difficulty: "medium",
        }),
      });
      const packData = (await packRes.json()) as PackResponse;

      if (!packRes.ok || !("puzzle" in packData)) {
        const message =
          "error" in packData
            ? packData.error
            : "Something went wrong building the grid.";
        throw new Error(message);
      }

      setPuzzle(packData.puzzle);
      setUserGrid(undefined);
      setPendingGenerate(null);
      setPhase("play");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setStatus("Couldn’t generate a puzzle");
      setDetail("Stay here and retry — your topic is still selected.");
      setPhase("generating");
    }
  }

  function handleNewPuzzle() {
    clearSession();
    setPuzzle(null);
    setUserGrid(undefined);
    setError(null);
    setPhase("create");
  }

  if (!hydrated) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-20 text-[var(--ink-muted)]">
        Loading…
      </div>
    );
  }

  if (phase === "play" && puzzle) {
    return (
      <CrosswordPlayer
        puzzle={puzzle}
        initialUserGrid={userGrid}
        onNewPuzzle={handleNewPuzzle}
      />
    );
  }

  if (phase === "generating") {
    return (
      <GeneratingWait
        status={status}
        detail={detail}
        error={error}
        onRetry={
          pendingGenerate
            ? () => void handleGenerate(pendingGenerate)
            : undefined
        }
        onCancel={() => {
          setError(null);
          setPhase("create");
        }}
      />
    );
  }

  return (
    <main className="relative flex flex-1 flex-col">
      <div className="atmosphere" aria-hidden />
      <section className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-16 md:py-24">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--accent)]">
          Themed Crossword
        </p>
        <h1 className="mt-3 max-w-xl font-[family-name:var(--font-display)] text-5xl leading-[1.05] tracking-tight text-[var(--ink)] md:text-6xl">
          Crosswords for any world you name.
        </h1>
        <p className="mt-4 max-w-lg text-lg text-[var(--ink-muted)]">
          Tap a topic spark below, or bring your own world — we craft interlocking
          clues you can solve in the browser.
        </p>
        <div className="mt-10">
          <TopicForm onSubmit={handleGenerate} error={error} />
        </div>
      </section>
    </main>
  );
}
