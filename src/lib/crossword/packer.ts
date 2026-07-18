import type { ClueCandidate, ClueEntry, Direction, PackOptions, Puzzle } from "./types";

type Placement = {
  answer: string;
  clue: string;
  row: number;
  col: number;
  dir: Direction;
};

function idx(row: number, col: number, size: number): number {
  return row * size + col;
}

function inBounds(row: number, col: number, size: number): boolean {
  return row >= 0 && col >= 0 && row < size && col < size;
}

function letterAt(
  cells: (string | null)[],
  row: number,
  col: number,
  size: number,
): string | null | undefined {
  if (!inBounds(row, col, size)) return undefined;
  return cells[idx(row, col, size)];
}

function canPlace(
  cells: (string | null)[],
  word: string,
  row: number,
  col: number,
  dir: Direction,
  size: number,
  requireCrossing: boolean,
): { ok: boolean; crossings: number } {
  let crossings = 0;

  const dr = dir === "down" ? 1 : 0;
  const dc = dir === "across" ? 1 : 0;

  const beforeR = row - dr;
  const beforeC = col - dc;
  const afterR = row + dr * word.length;
  const afterC = col + dc * word.length;

  const before = letterAt(cells, beforeR, beforeC, size);
  if (before !== undefined && before !== null) {
    return { ok: false, crossings: 0 };
  }
  const after = letterAt(cells, afterR, afterC, size);
  if (after !== undefined && after !== null) {
    return { ok: false, crossings: 0 };
  }

  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    if (!inBounds(r, c, size)) return { ok: false, crossings: 0 };

    const existing = cells[idx(r, c, size)];
    const ch = word[i]!;

    if (existing !== null && existing !== ch) {
      return { ok: false, crossings: 0 };
    }

    if (existing === ch) {
      crossings += 1;
    } else {
      // Open cell: perpendicular neighbors must not create an illegal adjacency
      // unless that neighbor is part of a crossing we will form later.
      const pr = dir === "across" ? 1 : 0;
      const pc = dir === "down" ? 1 : 0;
      const a = letterAt(cells, r - pr, c - pc, size);
      const b = letterAt(cells, r + pr, c + pc, size);
      if (a !== undefined && a !== null) return { ok: false, crossings: 0 };
      if (b !== undefined && b !== null) return { ok: false, crossings: 0 };
    }
  }

  if (requireCrossing && crossings === 0) {
    return { ok: false, crossings: 0 };
  }

  // Must place at least one new letter (not fully overlapped)
  if (crossings === word.length) {
    return { ok: false, crossings: 0 };
  }

  return { ok: true, crossings };
}

function placeWord(
  cells: (string | null)[],
  word: string,
  row: number,
  col: number,
  dir: Direction,
  size: number,
): void {
  const dr = dir === "down" ? 1 : 0;
  const dc = dir === "across" ? 1 : 0;
  for (let i = 0; i < word.length; i++) {
    cells[idx(row + dr * i, col + dc * i, size)] = word[i]!;
  }
}

function clearWord(
  cells: (string | null)[],
  word: string,
  row: number,
  col: number,
  dir: Direction,
  size: number,
  previous: (string | null)[],
): void {
  const dr = dir === "down" ? 1 : 0;
  const dc = dir === "across" ? 1 : 0;
  for (let i = 0; i < word.length; i++) {
    const i0 = idx(row + dr * i, col + dc * i, size);
    cells[i0] = previous[i] ?? null;
  }
}

function snapshotWord(
  cells: (string | null)[],
  word: string,
  row: number,
  col: number,
  dir: Direction,
  size: number,
): (string | null)[] {
  const dr = dir === "down" ? 1 : 0;
  const dc = dir === "across" ? 1 : 0;
  const prev: (string | null)[] = [];
  for (let i = 0; i < word.length; i++) {
    prev.push(cells[idx(row + dr * i, col + dc * i, size)] ?? null);
  }
  return prev;
}

function candidatePlacements(
  cells: (string | null)[],
  word: string,
  size: number,
  requireCrossing: boolean,
): Array<{ row: number; col: number; dir: Direction; crossings: number }> {
  const out: Array<{
    row: number;
    col: number;
    dir: Direction;
    crossings: number;
  }> = [];

  const dirs: Direction[] = ["across", "down"];
  for (const dir of dirs) {
    const maxR = dir === "across" ? size : size - word.length + 1;
    const maxC = dir === "down" ? size : size - word.length + 1;
    for (let row = 0; row < maxR; row++) {
      for (let col = 0; col < maxC; col++) {
        const { ok, crossings } = canPlace(
          cells,
          word,
          row,
          col,
          dir,
          size,
          requireCrossing,
        );
        if (ok) out.push({ row, col, dir, crossings });
      }
    }
  }

  out.sort((a, b) => b.crossings - a.crossings || a.row - b.row || a.col - b.col);
  return out;
}

function scoreCandidate(c: ClueCandidate): number {
  const len = c.answer.length;
  const midBonus = len >= 4 && len <= 8 ? 3 : 0;
  const unique = new Set(c.answer).size;
  return midBonus + unique + (len <= 10 ? 1 : 0);
}

function buildPuzzleFromPlacements(
  topic: string,
  size: number,
  placements: Placement[],
): Puzzle {
  const cells: (string | null)[] = Array.from({ length: size * size }, () => null);

  // One placement per answer — guards against accidental duplicate words.
  const uniquePlacements: Placement[] = [];
  const seenAnswers = new Set<string>();
  for (const p of placements) {
    if (seenAnswers.has(p.answer)) continue;
    seenAnswers.add(p.answer);
    uniquePlacements.push(p);
  }

  for (const p of uniquePlacements) {
    placeWord(cells, p.answer, p.row, p.col, p.dir, size);
  }

  // Number only cells that start an intentional placement (not accidental letter runs).
  const acrossByStart = new Map<string, Placement>();
  const downByStart = new Map<string, Placement>();
  for (const p of uniquePlacements) {
    const key = `${p.row},${p.col}`;
    if (p.dir === "across") acrossByStart.set(key, p);
    else downByStart.set(key, p);
  }

  let nextNum = 1;
  const across: ClueEntry[] = [];
  const down: ClueEntry[] = [];

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const key = `${row},${col}`;
      const acrossPlacement = acrossByStart.get(key);
      const downPlacement = downByStart.get(key);
      if (!acrossPlacement && !downPlacement) continue;

      const num = nextNum++;

      if (acrossPlacement) {
        across.push({
          num,
          row,
          col,
          answer: acrossPlacement.answer,
          clue: acrossPlacement.clue,
        });
      }

      if (downPlacement) {
        down.push({
          num,
          row,
          col,
          answer: downPlacement.answer,
          clue: downPlacement.clue,
        });
      }
    }
  }

  across.sort((a, b) => a.num - b.num);
  down.sort((a, b) => a.num - b.num);

  return {
    topic,
    size,
    grid: cells,
    clues: { across, down },
  };
}

function trimGrid(puzzle: Puzzle): Puzzle {
  const { size, grid } = puzzle;
  let minR = size;
  let maxR = -1;
  let minC = size;
  let maxC = -1;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[idx(r, c, size)] !== null) {
        minR = Math.min(minR, r);
        maxR = Math.max(maxR, r);
        minC = Math.min(minC, c);
        maxC = Math.max(maxC, c);
      }
    }
  }

  if (maxR < 0) return puzzle;

  // Keep a 1-cell padding when possible
  minR = Math.max(0, minR);
  minC = Math.max(0, minC);
  maxR = Math.min(size - 1, maxR);
  maxC = Math.min(size - 1, maxC);

  const newRows = maxR - minR + 1;
  const newCols = maxC - minC + 1;
  const newSize = Math.max(newRows, newCols);

  // Re-number on trimmed grid for consistency
  return buildPuzzleFromPlacements(
    puzzle.topic,
    newSize,
    [
      ...puzzle.clues.across.map((c) => ({
        answer: c.answer,
        clue: c.clue,
        row: c.row - minR,
        col: c.col - minC,
        dir: "across" as const,
      })),
      ...puzzle.clues.down.map((c) => ({
        answer: c.answer,
        clue: c.clue,
        row: c.row - minR,
        col: c.col - minC,
        dir: "down" as const,
      })),
    ],
  );
}

/**
 * Pack themed answers into a crossword grid via backtracking.
 * Uses letters-only open cells; unused cells become blocks.
 */
export function packCrossword(
  topic: string,
  candidates: ClueCandidate[],
  options: PackOptions = {},
): Puzzle | null {
  const size = options.size ?? 15;
  const timeBudgetMs = options.timeBudgetMs ?? 2500;
  const minWords = options.minWords ?? 8;
  const started = Date.now();

  const sorted = [...candidates]
    .filter((c) => /^[A-Z]{3,12}$/.test(c.answer))
    .sort((a, b) => b.answer.length - a.answer.length || scoreCandidate(b) - scoreCandidate(a));

  if (sorted.length < minWords) return null;

  const state: { best: Placement[] | null } = { best: null };
  const cells: (string | null)[] = Array.from({ length: size * size }, () => null);
  const placed: Placement[] = [];
  const used = new Set<string>();

  function seedBoard(words: ClueCandidate[]): void {
    cells.fill(null);
    placed.length = 0;
    used.clear();
    const seed = words[0]!;
    const seedRow = Math.floor(size / 2);
    const seedCol = Math.max(0, Math.floor((size - seed.answer.length) / 2));
    placeWord(cells, seed.answer, seedRow, seedCol, "across", size);
    placed.push({
      answer: seed.answer,
      clue: seed.clue,
      row: seedRow,
      col: seedCol,
      dir: "across",
    });
    used.add(seed.answer);
  }

  function search(pool: ClueCandidate[]): boolean {
    if (Date.now() - started > timeBudgetMs) {
      if (!state.best || placed.length > state.best.length) {
        state.best = placed.map((p) => ({ ...p }));
      }
      return false;
    }

    if (placed.length > (state.best?.length ?? 0)) {
      state.best = placed.map((p) => ({ ...p }));
    }

    // Keep searching until we clear the minimum with a little headroom.
    if (placed.length >= Math.min(pool.length, Math.max(minWords + 3, 18))) {
      return true;
    }

    const remaining = pool.filter((c) => !used.has(c.answer));
    if (remaining.length === 0) return true;

    const batch = remaining.slice(0, 12);

    for (const cand of batch) {
      const placements = candidatePlacements(cells, cand.answer, size, true).slice(
        0,
        8,
      );
      for (const slot of placements) {
        const prev = snapshotWord(
          cells,
          cand.answer,
          slot.row,
          slot.col,
          slot.dir,
          size,
        );
        placeWord(cells, cand.answer, slot.row, slot.col, slot.dir, size);
        placed.push({
          answer: cand.answer,
          clue: cand.clue,
          row: slot.row,
          col: slot.col,
          dir: slot.dir,
        });
        used.add(cand.answer);

        if (search(pool)) return true;

        used.delete(cand.answer);
        placed.pop();
        clearWord(cells, cand.answer, slot.row, slot.col, slot.dir, size, prev);
      }
    }

    if (batch[0]) {
      used.add(batch[0].answer);
      const ok = search(pool);
      used.delete(batch[0].answer);
      if (ok) return true;
    }

    return false;
  }

  let attemptWords = sorted;
  seedBoard(attemptWords);
  search(attemptWords);

  while (
    (state.best === null || state.best.length < minWords) &&
    attemptWords.length > minWords
  ) {
    attemptWords = attemptWords.slice(
      0,
      Math.max(minWords, attemptWords.length - 4),
    );
    state.best = null;
    seedBoard(attemptWords);
    search(attemptWords);
  }

  const finalPlacements = state.best;
  if (finalPlacements === null || finalPlacements.length < minWords) {
    return null;
  }

  const puzzle = buildPuzzleFromPlacements(topic, size, finalPlacements);
  const trimmed = trimGrid(puzzle);
  const placedCount =
    trimmed.clues.across.length + trimmed.clues.down.length;
  if (placedCount < minWords) {
    return null;
  }

  const answers = [
    ...trimmed.clues.across.map((c) => c.answer),
    ...trimmed.clues.down.map((c) => c.answer),
  ];
  if (new Set(answers).size !== answers.length) {
    return null;
  }

  return trimmed;
}
