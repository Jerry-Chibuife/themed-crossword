"use client";

import { useEffect, useState } from "react";
import { CrosswordPlayer } from "@/components/CrosswordPlayer";
import { TopicForm } from "@/components/TopicForm";
import type { Puzzle } from "@/lib/crossword/types";
import { clearSession, loadSession } from "@/lib/storage";

type Phase = "create" | "generating" | "play";

type GenerateResponse =
  | { puzzle: Puzzle; meta?: { usedFixture?: boolean } }
  | { error: string; stage?: string };

export function AppShell() {
  const [phase, setPhase] = useState<Phase>("create");
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [userGrid, setUserGrid] = useState<(string | null)[] | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Gathering clues…");
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

    const statusTimer = window.setTimeout(() => {
      setStatus("Building grid…");
    }, 1200);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await response.json()) as GenerateResponse;

      if (!response.ok || !("puzzle" in data)) {
        const message =
          "error" in data
            ? data.error
            : "Something went wrong generating the puzzle.";
        const stage = "stage" in data && data.stage ? ` (${data.stage})` : "";
        throw new Error(`${message}${stage}`);
      }

      setPuzzle(data.puzzle);
      setUserGrid(undefined);
      setPhase("play");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setPhase("create");
    } finally {
      window.clearTimeout(statusTimer);
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
      <main className="relative flex flex-1 flex-col items-center justify-center px-4 py-20">
        <div className="atmosphere" aria-hidden />
        <div className="relative z-10 text-center">
          <p className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
            {status}
          </p>
          <p className="mt-3 text-[var(--ink-muted)]">
            Building a themed grid from your topic.
          </p>
          <div className="mx-auto mt-8 h-1 w-40 overflow-hidden rounded-full bg-black/10">
            <div className="progress-bar h-full w-1/2 rounded-full bg-[var(--accent)]" />
          </div>
        </div>
      </main>
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
