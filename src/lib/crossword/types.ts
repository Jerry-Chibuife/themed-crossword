export type ClueCandidate = {
  answer: string;
  clue: string;
};

export type ClueEntry = {
  num: number;
  row: number;
  col: number;
  answer: string;
  clue: string;
};

export type Puzzle = {
  topic: string;
  size: number;
  grid: (string | null)[];
  clues: {
    across: ClueEntry[];
    down: ClueEntry[];
  };
};

export type Direction = "across" | "down";

export type PackOptions = {
  size?: number;
  timeBudgetMs?: number;
  minWords?: number;
};