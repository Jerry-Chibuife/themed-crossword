"use client";

import { useEffect, useMemo } from "react";
import { getWordFillStatus } from "@/lib/crossword/helpers";
import type { ClueEntry, Direction, Puzzle } from "@/lib/crossword/types";

type CluesDrawerProps = {
  open: boolean;
  onClose: () => void;
  puzzle: Puzzle;
  userGrid: (string | null)[];
  across: ClueEntry[];
  down: ClueEntry[];
  activeDir: Direction;
  activeNum: number | null;
  tab: Direction;
  onTabChange: (dir: Direction) => void;
  onSelect: (clue: ClueEntry, dir: Direction) => void;
};

const TRANSITION_MS = 280;

function clueStatusKey(dir: Direction, num: number): string {
  return `${dir}:${num}`;
}

export function CluesDrawer({
  open,
  onClose,
  puzzle,
  userGrid,
  across,
  down,
  activeDir,
  activeNum,
  tab,
  onTabChange,
  onSelect,
}: CluesDrawerProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

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

  const clues = tab === "across" ? across : down;

  return (
    <div
      className={`fixed inset-0 z-40 lg:hidden ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
      {...(open
        ? { role: "dialog" as const, "aria-modal": true, "aria-label": "Clues" }
        : {})}
    >
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label="Close clues"
        className={`absolute inset-0 bg-[var(--ink)]/35 transition-opacity ease-out ${
          open ? "opacity-100" : "opacity-0"
        }`}
        style={{ transitionDuration: `${TRANSITION_MS}ms` }}
        onClick={onClose}
      />
      <aside
        className={`absolute inset-y-0 right-0 flex w-1/3 min-w-0 flex-col border-l border-[var(--ink)]/10 bg-[var(--paper)] shadow-[-12px_0_40px_-20px_rgba(26,35,50,0.45)] transition-[transform,opacity] ease-out ${
          open ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
        }`}
        style={{ transitionDuration: `${TRANSITION_MS}ms` }}
      >
        <div className="flex items-center justify-end px-2 pt-2">
          <button
            type="button"
            tabIndex={open ? 0 : -1}
            className="rounded-md px-2.5 py-1.5 text-lg leading-none text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)]"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="mt-14 flex gap-1.5 px-2 pb-3">
          {(["across", "down"] as const).map((dir) => (
            <button
              key={dir}
              type="button"
              tabIndex={open ? 0 : -1}
              onClick={() => onTabChange(dir)}
              className={`flex-1 rounded-md px-2 py-2 text-sm font-medium capitalize ${
                tab === dir
                  ? "bg-[var(--ink)] text-[var(--paper)]"
                  : "bg-black/5 text-[var(--ink-muted)]"
              }`}
            >
              {dir}
            </button>
          ))}
        </div>

        <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
          {clues.map((clue) => {
            const solved = solvedKeys.has(clueStatusKey(tab, clue.num));
            const active = activeDir === tab && activeNum === clue.num;
            return (
              <li key={`${tab}-${clue.num}`}>
                <button
                  type="button"
                  tabIndex={open ? 0 : -1}
                  onClick={() => {
                    onSelect(clue, tab);
                    onClose();
                  }}
                  className={`flex w-full items-start gap-1.5 rounded-md px-1.5 py-1.5 text-left text-sm leading-snug transition-colors ${
                    solved
                      ? "text-[var(--ink-muted)]/55"
                      : active
                        ? "bg-[var(--accent-soft)] text-[var(--ink)]"
                        : "text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)]"
                  }`}
                >
                  <span
                    className={`shrink-0 font-[family-name:var(--font-display)] font-semibold ${
                      solved ? "text-[var(--ink-muted)]/55" : "text-[var(--ink)]"
                    }`}
                  >
                    {clue.num}.
                  </span>
                  <span className="min-w-0 flex-1">
                    {clue.clue}
                    {solved ? (
                      <span
                        className="ml-1 inline-block align-middle text-[var(--success)]"
                        aria-label="Solved"
                      >
                        ✓
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>
    </div>
  );
}
