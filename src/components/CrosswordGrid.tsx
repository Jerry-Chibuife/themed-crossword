"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

const MIN_CELL_PX = 18;
const MAX_CELL_PX = 36;

export function CrosswordGrid({
  puzzle,
  userGrid,
  selected,
  direction,
  checked,
  onSelect,
}: CrosswordGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [boardPx, setBoardPx] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function updateSize() {
      if (!el) return;
      const width = el.clientWidth;
      // gap-px between cells + 1px padding on each side of the board
      const chrome = puzzle.size - 1 + 2;
      const minBoard = puzzle.size * MIN_CELL_PX + chrome;
      const maxBoard = puzzle.size * MAX_CELL_PX + chrome;
      const next = Math.max(minBoard, Math.min(maxBoard, width));
      setBoardPx(next);
    }

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [puzzle.size]);

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

  const desktopCap = puzzle.size * MAX_CELL_PX + puzzle.size + 1;

  return (
    <div ref={containerRef} className="w-full min-w-0 max-w-full overflow-x-auto">
      <div
        className="mx-auto lg:mx-0 lg:max-w-[var(--board-cap)]"
        style={
          {
            width: boardPx ? `${boardPx}px` : "100%",
            maxWidth: "100%",
            "--board-cap": `${desktopCap}px`,
          } as React.CSSProperties
        }
      >
        <div
          className="grid w-full gap-px rounded-sm bg-[var(--ink)] p-px shadow-[0_20px_50px_-24px_rgba(26,35,50,0.55)]"
          style={{
            gridTemplateColumns: `repeat(${puzzle.size}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${puzzle.size}, minmax(0, 1fr))`,
            aspectRatio: "1 / 1",
          }}
          role="grid"
          aria-label={`${puzzle.topic} crossword`}
        >
          {puzzle.grid.map((solution, i) => {
            const row = Math.floor(i / puzzle.size);
            const col = i % puzzle.size;
            if (solution === null) {
              return (
                <div key={i} className="min-w-0 bg-[var(--ink)]" aria-hidden />
              );
            }

            const value = (userGrid[i] ?? "").toUpperCase();
            const isSelected = selected.row === row && selected.col === col;
            const isHighlighted = highlight.has(cellKey(row, col));
            const wordStatus = wordStatusByCell.get(cellKey(row, col));
            const isWrongLetter = checked && value !== "" && value !== solution;
            const num = numbers.get(cellKey(row, col));

            let cellClass = "bg-[var(--paper)] text-[var(--ink)]";
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
                className={`relative flex min-w-0 items-center justify-center font-[family-name:var(--font-mono)] text-[clamp(0.65rem,2.8vw,1rem)] font-semibold uppercase outline-none transition-colors ${cellClass}`}
                aria-invalid={wordStatus === "incorrect" || isWrongLetter}
              >
                {num !== undefined ? (
                  <span className="absolute left-0.5 top-0 text-[clamp(7px,1.8vw,10px)] font-sans font-medium leading-none text-current opacity-70">
                    {num}
                  </span>
                ) : null}
                {value}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
