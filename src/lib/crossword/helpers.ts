import type { ClueEntry, Direction, Puzzle } from "./types";

export function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function getClueAt(
  puzzle: Puzzle,
  row: number,
  col: number,
  dir: Direction,
): ClueEntry | null {
  const list = dir === "across" ? puzzle.clues.across : puzzle.clues.down;
  for (const clue of list) {
    if (dir === "across") {
      if (
        clue.row === row &&
        col >= clue.col &&
        col < clue.col + clue.answer.length
      ) {
        return clue;
      }
    } else if (
      clue.col === col &&
      row >= clue.row &&
      row < clue.row + clue.answer.length
    ) {
      return clue;
    }
  }
  return null;
}

export function clueCells(clue: ClueEntry, dir: Direction): Array<{ row: number; col: number }> {
  const cells: Array<{ row: number; col: number }> = [];
  for (let i = 0; i < clue.answer.length; i++) {
    cells.push(
      dir === "across"
        ? { row: clue.row, col: clue.col + i }
        : { row: clue.row + i, col: clue.col },
    );
  }
  return cells;
}

export function buildNumberMap(puzzle: Puzzle): Map<string, number> {
  const map = new Map<string, number>();
  for (const clue of [...puzzle.clues.across, ...puzzle.clues.down]) {
    map.set(cellKey(clue.row, clue.col), clue.num);
  }
  return map;
}

export function emptyUserGrid(puzzle: Puzzle): (string | null)[] {
  return puzzle.grid.map((cell) => (cell === null ? null : ""));
}

export function isPuzzleComplete(puzzle: Puzzle, userGrid: (string | null)[]): boolean {
  for (let i = 0; i < puzzle.grid.length; i++) {
    const solution = puzzle.grid[i];
    if (solution === null) continue;
    if ((userGrid[i] ?? "").toUpperCase() !== solution) return false;
  }
  return true;
}

export function nextOpenCell(
  puzzle: Puzzle,
  row: number,
  col: number,
  dir: Direction,
  delta: 1 | -1,
): { row: number; col: number } | null {
  const clue = getClueAt(puzzle, row, col, dir);
  if (!clue) return null;
  const cells = clueCells(clue, dir);
  const index = cells.findIndex((c) => c.row === row && c.col === col);
  if (index < 0) return null;
  const next = cells[index + delta];
  return next ?? null;
}
