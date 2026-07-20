"use client";

import { useMemo } from "react";
import {
  buildNumberMap,
  cellKey,
  clueCells,
  getCellWordStatus,
  getClueAt,
} from "@/lib/crossword/helpers";
import type { Direction, Puzzle } from "@/lib/crossword/types";

type CrosswordGridProps = {
  puzzle: Puzzle;
  userGrid: (string | null)[];
  selected: { row: number; col: number };
  direction: Direction;
  checked: boolean;
  onSelect: (row: number, col: number) => void;
};

export function CrosswordGrid({
  puzzle,
  userGrid,
  selected,
  direction,
  checked,
  onSelect,
}: CrosswordGridProps) {
  const numbers = useMemo(() => buildNumberMap(puzzle), [puzzle]);
  const activeClue = getClueAt(puzzle, selected.row, selected.col, direction);
  const highlight = useMemo(() => {
    const set = new Set<string>();
    if (!activeClue) return set;
    for (const cell of clueCells(activeClue, direction)) {
      set.add(cellKey(cell.row, cell.col));
    }
    return set;
  }, [activeClue, direction]);

  const wordStatusByCell = useMemo(() => {
    const map = new Map<string, "correct" | "incorrect">();
    for (let i = 0; i < puzzle.grid.length; i++) {
      if (puzzle.grid[i] === null) continue;
      const row = Math.floor(i / puzzle.size);
      const col = i % puzzle.size;
      const status = getCellWordStatus(puzzle, userGrid, row, col);
      if (status) map.set(cellKey(row, col), status);
    }
    return map;
  }, [puzzle, userGrid]);

  const cellSize = `min(36px, calc((100vw - 2rem) / ${puzzle.size}))`;

  return (
    <div
      className="inline-grid gap-px rounded-sm bg-[var(--ink)] p-px shadow-[0_20px_50px_-24px_rgba(26,35,50,0.55)]"
      style={{
        gridTemplateColumns: `repeat(${puzzle.size}, ${cellSize})`,
        gridTemplateRows: `repeat(${puzzle.size}, ${cellSize})`,
      }}
      role="grid"
      aria-label={`${puzzle.topic} crossword`}
    >
      {puzzle.grid.map((solution, i) => {
        const row = Math.floor(i / puzzle.size);
        const col = i % puzzle.size;
        if (solution === null) {
          return (
            <div
              key={i}
              className="bg-[var(--ink)]"
              style={{ width: cellSize, height: cellSize }}
              aria-hidden
            />
          );
        }

        const value = (userGrid[i] ?? "").toUpperCase();
        const isSelected = selected.row === row && selected.col === col;
        const isHighlighted = highlight.has(cellKey(row, col));
        const wordStatus = wordStatusByCell.get(cellKey(row, col));
        const isWrongLetter = checked && value !== "" && value !== solution;
        const num = numbers.get(cellKey(row, col));

        let cellClass =
          "bg-[var(--paper)] text-[var(--ink)]";
        if (wordStatus === "correct") {
          cellClass = "bg-[var(--success-soft)] text-[var(--success)]";
        } else if (wordStatus === "incorrect") {
          cellClass = "bg-[var(--danger-soft)] text-[var(--danger)]";
        } else if (isHighlighted) {
          cellClass = "bg-[var(--accent-soft)] text-[var(--ink)]";
        }

        if (isSelected) {
          cellClass = "bg-[var(--accent)] text-white";
        }

        if (isWrongLetter && !isSelected) {
          cellClass += " text-[var(--danger)]";
        }

        return (
          <button
            key={i}
            type="button"
            role="gridcell"
            onClick={() => onSelect(row, col)}
            className={`relative flex items-center justify-center font-[family-name:var(--font-mono)] text-sm font-semibold uppercase outline-none transition-colors sm:text-base ${cellClass}`}
            style={{ width: cellSize, height: cellSize }}
            aria-invalid={wordStatus === "incorrect" || isWrongLetter}
          >
            {num !== undefined ? (
              <span className="absolute left-0.5 top-0 text-[9px] font-sans font-medium leading-none text-current opacity-70 sm:text-[10px]">
                {num}
              </span>
            ) : null}
            {value}
          </button>
        );
      })}
    </div>
  );
}
