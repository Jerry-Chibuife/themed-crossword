"use client";

import { useEffect, useState } from "react";
import { CrosswordPlayer } from "@/components/CrosswordPlayer";
import { GeneratingWait } from "@/components/GeneratingWait";
import { TopicForm } from "@/components/TopicForm";
import {
  MAX_CLUE_TOPUPS,
  MIN_PUZZLE_WORDS,
} from "@/lib/api/schemas";
import type { ClueCandidate, Puzzle } from "@/lib/crossword/types";
import { clearSession, loadSession } from "@/lib/storage";

type Phase = "create" | "generating" | "play";

type CluesResponse =
  | {
      topic: string;
      clues: ClueCandidate[];
      meta?: { usedFixture?: boolean; clueCount?: number; partial?: boolean };
    }
  | { error: string; stage?: string };

type PackResponse =
  | { puzzle: Puzzle; meta?: { placed?: number } }
  | { error: string; stage?: string };

function mergeUnique(
  existing: ClueCandidate[],
  incoming: ClueCandidate[],
): ClueCandidate[] {
  const seen = new Set(existing.map((c) => c.answer));
  const out = [...existing];
  for (const clue of incoming) {
    const answer = clue.answer.toUpperCase().replace(/[^A-Z]/g, "");
    if (answer.length < 3 || seen.has(answer)) continue;
    seen.add(answer);
    out.push({ ...clue, answer });
  }
  return out;
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
    throw new Error(message);
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

  useEffect(() => {
    const session = loadSession();
    if (session) {
      setPuzzle(session.puzzle);
      setUserGrid(session.userGrid);
      setPhase("play");
    }
    setHydrated(true);
  }, []);

  async function handleGenerate(values: { topic: string; notes: string }) {
    setError(null);
    setPhase("generating");
    setStatus("Gathering clues…");
    setDetail("Asking the model for themed answers.");

    try {
      let clues: ClueCandidate[] = [];

      // First pass + up to MAX_CLUE_TOPUPS more rounds (each gets its own time budget).
      for (let round = 0; round <= MAX_CLUE_TOPUPS; round++) {
        if (clues.length >= MIN_PUZZLE_WORDS) break;

        const needed = MIN_PUZZLE_WORDS - clues.length;
        // First pass aims high so one round often clears 24; top-ups fill the gap.
        const count =
          round === 0
            ? 30
            : Math.min(36, Math.max(needed + 4, 10));

        if (round === 0) {
          setStatus("Gathering clues…");
          setDetail("Asking the model for themed answers.");
        } else {
          setStatus("Gathering more clues…");
          setDetail(
            `Have ${clues.length} of ${MIN_PUZZLE_WORDS} — requesting ${count} more.`,
          );
        }

        const batch = await fetchClueBatch({
          topic: values.topic,
          notes: values.notes,
          exclude: clues.map((c) => c.answer),
          count,
        });

        const before = clues.length;
        clues = mergeUnique(clues, batch);

        // Top-up returned nothing new — stop looping.
        if (clues.length === before && round > 0) break;
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
      setPhase("play");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setPhase("create");
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
    return <GeneratingWait status={status} detail={detail} />;
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
          Pick a book, film, industry, language, or culture — we craft interlocking
          clues you can solve in the browser.
        </p>
        <div className="mt-10">
          <TopicForm onSubmit={handleGenerate} error={error} />
        </div>
      </section>
    </main>
  );
}
