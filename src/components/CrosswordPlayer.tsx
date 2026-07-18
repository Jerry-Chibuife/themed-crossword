"use client";

import { useEffect, useMemo, useState } from "react";
import { ClueList } from "@/components/ClueList";
import { CrosswordGrid } from "@/components/CrosswordGrid";
import {
  clueCells,
  emptyUserGrid,
  getClueAt,
  isPuzzleComplete,
  nextOpenCell,
} from "@/lib/crossword/helpers";
import type { ClueEntry, Direction, Puzzle } from "@/lib/crossword/types";
import { saveSession } from "@/lib/storage";

type CrosswordPlayerProps = {
  puzzle: Puzzle;
  initialUserGrid?: (string | null)[];
  onNewPuzzle: () => void;
};

function firstLetterCell(puzzle: Puzzle): { row: number; col: number } {
  for (let i = 0; i < puzzle.grid.length; i++) {
    if (puzzle.grid[i] !== null) {
      return { row: Math.floor(i / puzzle.size), col: i % puzzle.size };
    }
  }
  return { row: 0, col: 0 };
}

export function CrosswordPlayer({
  puzzle,
  initialUserGrid,
  onNewPuzzle,
}: CrosswordPlayerProps) {
  const [userGrid, setUserGrid] = useState<(string | null)[]>(
    () => initialUserGrid ?? emptyUserGrid(puzzle),
  );
  const [selected, setSelected] = useState(() => firstLetterCell(puzzle));
  const [direction, setDirection] = useState<Direction>("across");
  const [mobileTab, setMobileTab] = useState<Direction>("across");
  const [checked, setChecked] = useState(false);
  const [complete, setComplete] = useState(false);

  const activeClue = useMemo(
    () => getClueAt(puzzle, selected.row, selected.col, direction),
    [puzzle, selected, direction],
  );

  useEffect(() => {
    saveSession({ puzzle, userGrid, updatedAt: Date.now() });
    setComplete(isPuzzleComplete(puzzle, userGrid));
  }, [puzzle, userGrid]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "Tab") {
        event.preventDefault();
        setDirection((d) => (d === "across" ? "down" : "across"));
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (direction !== "across") setDirection("across");
        else move(1);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (direction !== "across") setDirection("across");
        else move(-1);
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (direction !== "down") setDirection("down");
        else move(1);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        if (direction !== "down") setDirection("down");
        else move(-1);
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        writeLetter("");
        const prev = nextOpenCell(
          puzzle,
          selected.row,
          selected.col,
          direction,
          -1,
        );
        if (prev) setSelected(prev);
        return;
      }

      if (/^[a-zA-Z]$/.test(event.key)) {
        event.preventDefault();
        writeLetter(event.key.toUpperCase());
        const next = nextOpenCell(
          puzzle,
          selected.row,
          selected.col,
          direction,
          1,
        );
        if (next) setSelected(next);
      }
    }

    function move(delta: 1 | -1) {
      const next = nextOpenCell(
        puzzle,
        selected.row,
        selected.col,
        direction,
        delta,
      );
      if (next) setSelected(next);
    }

    function writeLetter(letter: string) {
      const i = selected.row * puzzle.size + selected.col;
      if (puzzle.grid[i] === null) return;
      setUserGrid((prev) => {
        const next = [...prev];
        next[i] = letter;
        return next;
      });
      setChecked(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [direction, puzzle, selected]);

  function handleSelectCell(row: number, col: number) {
    if (puzzle.grid[row * puzzle.size + col] === null) return;
    if (selected.row === row && selected.col === col) {
      setDirection((d) => (d === "across" ? "down" : "across"));
      return;
    }
    setSelected({ row, col });
  }

  function handleSelectClue(clue: ClueEntry, dir: Direction) {
    setDirection(dir);
    setMobileTab(dir);
    setSelected({ row: clue.row, col: clue.col });
  }

  function revealLetter() {
    const i = selected.row * puzzle.size + selected.col;
    const solution = puzzle.grid[i];
    if (solution === null) return;
    setUserGrid((prev) => {
      const next = [...prev];
      next[i] = solution;
      return next;
    });
  }

  function revealWord() {
    if (!activeClue) return;
    setUserGrid((prev) => {
      const next = [...prev];
      for (const cell of clueCells(activeClue, direction)) {
        const i = cell.row * puzzle.size + cell.col;
        next[i] = puzzle.grid[i];
      }
      return next;
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
            Themed Crossword
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--ink)] md:text-4xl">
            {puzzle.topic}
          </h1>
          {activeClue ? (
            <p className="mt-2 max-w-xl text-[var(--ink-muted)]">
              <span className="font-semibold text-[var(--ink)]">
                {activeClue.num} {direction === "across" ? "Across" : "Down"}
              </span>
              {" — "}
              {activeClue.clue}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={() => setChecked(true)}>
            Check
          </button>
          <button type="button" className="btn-secondary" onClick={revealLetter}>
            Reveal letter
          </button>
          <button type="button" className="btn-secondary" onClick={revealWord}>
            Reveal word
          </button>
          <button type="button" className="btn-primary" onClick={onNewPuzzle}>
            New puzzle
          </button>
        </div>
      </header>

      {complete ? (
        <div className="rounded-md border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-4 py-3 text-[var(--ink)]">
          Puzzle complete.{" "}
          <button type="button" className="underline" onClick={onNewPuzzle}>
            Try another topic
          </button>
        </div>
      ) : null}

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <div className="flex justify-center lg:justify-start">
          <CrosswordGrid
            puzzle={puzzle}
            userGrid={userGrid}
            selected={selected}
            direction={direction}
            checked={checked}
            onSelect={handleSelectCell}
          />
        </div>
        <div className="min-h-[280px] lg:h-[min(70vh,640px)]">
          <ClueList
            across={puzzle.clues.across}
            down={puzzle.clues.down}
            activeDir={direction}
            activeNum={activeClue?.num ?? null}
            onSelect={handleSelectClue}
            mobileTab={mobileTab}
            onMobileTabChange={setMobileTab}
          />
        </div>
      </div>
    </div>
  );
}
