"use client";

import { useMemo } from "react";
import { getWordFillStatus } from "@/lib/crossword/helpers";
import type { ClueEntry, Direction, Puzzle } from "@/lib/crossword/types";

type ClueListProps = {
  puzzle: Puzzle;
  userGrid: (string | null)[];
  across: ClueEntry[];
  down: ClueEntry[];
  activeDir: Direction;
  activeNum: number | null;
  onSelect: (clue: ClueEntry, dir: Direction) => void;
  mobileTab: Direction;
  onMobileTabChange: (dir: Direction) => void;
};

function clueStatusKey(dir: Direction, num: number): string {
  return `${dir}:${num}`;
}

function ClueButton({
  clue,
  dir,
  active,
  solved,
  onSelect,
}: {
  clue: ClueEntry;
  dir: Direction;
  active: boolean;
  solved: boolean;
  onSelect: (clue: ClueEntry, dir: Direction) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(clue, dir)}
      className={`flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm leading-snug transition-colors ${
        solved
          ? "text-[var(--ink-muted)]/55"
          : active
            ? "bg-[var(--accent-soft)] text-[var(--ink)]"
            : "text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)]"
      }`}
    >
      <span
        className={`mr-0 shrink-0 font-[family-name:var(--font-display)] font-semibold ${
          solved ? "text-[var(--ink-muted)]/55" : "text-[var(--ink)]"
        }`}
      >
        {clue.num}.
      </span>
      <span className="min-w-0 flex-1">
        {clue.clue}
        {solved ? (
          <span
            className="ml-1.5 inline-block align-middle text-[var(--success)]"
            aria-label="Solved"
          >
            ✓
          </span>
        ) : null}
      </span>
    </button>
  );
}

export function ClueList({
  puzzle,
  userGrid,
  across,
  down,
  activeDir,
  activeNum,
  onSelect,
  mobileTab,
  onMobileTabChange,
}: ClueListProps) {
  const solvedKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const clue of across) {
      if (getWordFillStatus(puzzle, userGrid, clue, "across") === "correct") {
        keys.add(clueStatusKey("across", clue.num));
      }
    }
    for (const clue of down) {
      if (getWordFillStatus(puzzle, userGrid, clue, "down") === "correct") {
        keys.add(clueStatusKey("down", clue.num));
      }
    }
    return keys;
  }, [puzzle, userGrid, across, down]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex gap-2 md:hidden">
        {(["across", "down"] as const).map((dir) => (
          <button
            key={dir}
            type="button"
            onClick={() => onMobileTabChange(dir)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium capitalize ${
              mobileTab === dir
                ? "bg-[var(--ink)] text-[var(--paper)]"
                : "bg-black/5 text-[var(--ink-muted)]"
            }`}
          >
            {dir}
          </button>
        ))}
      </div>

      <div className="hidden min-h-0 flex-1 gap-6 overflow-hidden md:grid md:grid-cols-2">
        <section className="min-h-0 overflow-y-auto pr-1">
          <h3 className="mb-2 font-[family-name:var(--font-display)] text-lg tracking-tight text-[var(--ink)]">
            Across
          </h3>
          <ul className="space-y-0.5">
            {across.map((clue) => (
              <li key={`a-${clue.num}`}>
                <ClueButton
                  clue={clue}
                  dir="across"
                  active={activeDir === "across" && activeNum === clue.num}
                  solved={solvedKeys.has(clueStatusKey("across", clue.num))}
                  onSelect={onSelect}
                />
              </li>
            ))}
          </ul>
        </section>
        <section className="min-h-0 overflow-y-auto pr-1">
          <h3 className="mb-2 font-[family-name:var(--font-display)] text-lg tracking-tight text-[var(--ink)]">
            Down
          </h3>
          <ul className="space-y-0.5">
            {down.map((clue) => (
              <li key={`d-${clue.num}`}>
                <ClueButton
                  clue={clue}
                  dir="down"
                  active={activeDir === "down" && activeNum === clue.num}
                  solved={solvedKeys.has(clueStatusKey("down", clue.num))}
                  onSelect={onSelect}
                />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto md:hidden">
        <ul className="space-y-0.5">
          {(mobileTab === "across" ? across : down).map((clue) => (
            <li key={`m-${mobileTab}-${clue.num}`}>
              <ClueButton
                clue={clue}
                dir={mobileTab}
                active={activeDir === mobileTab && activeNum === clue.num}
                solved={solvedKeys.has(clueStatusKey(mobileTab, clue.num))}
                onSelect={onSelect}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
