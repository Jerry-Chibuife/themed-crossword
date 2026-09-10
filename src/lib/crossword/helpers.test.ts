import { describe, expect, it } from "vitest";
import {
  getCellWordStatus,
  getWordFillStatus,
  isProtectedCrossingCell,
} from "./helpers";
import type { Puzzle } from "./types";

const puzzle: Puzzle = {
  topic: "Test",
  size: 5,
  // CAT across row 0; COP down col 0
  grid: [
    "C", "A", "T", null, null,
    "O", null, null, null, null,
    "P", null, null, null, null,
    null, null, null, null, null,
    null, null, null, null, null,
  ],
  clues: {
    across: [{ num: 1, row: 0, col: 0, answer: "CAT", clue: "Feline" }],
    down: [{ num: 1, row: 0, col: 0, answer: "COP", clue: "Officer" }],
  },
};

describe("word completion colors", () => {
  it("marks a fully correct word", () => {
    const userGrid = [
      "C", "A", "T", null, null,
      "", null, null, null, null,
      "", null, null, null, null,
      null, null, null, null, null,
      null, null, null, null, null,
    ];
    expect(
      getWordFillStatus(puzzle, userGrid, puzzle.clues.across[0]!, "across"),
    ).toBe("correct");
  });

  it("marks a fully filled incorrect word", () => {
    const userGrid = [
      "C", "A", "R", null, null,
      "", null, null, null, null,
      "", null, null, null, null,
      null, null, null, null, null,
      null, null, null, null, null,
    ];
    expect(
      getWordFillStatus(puzzle, userGrid, puzzle.clues.across[0]!, "across"),
    ).toBe("incorrect");
    expect(getCellWordStatus(puzzle, userGrid, 0, 1)).toBe("incorrect");
  });

  it("stays incomplete until every letter is filled", () => {
    const userGrid = [
      "C", "A", "", null, null,
      "", null, null, null, null,
      "", null, null, null, null,
      null, null, null, null, null,
      null, null, null, null, null,
    ];
    expect(
      getWordFillStatus(puzzle, userGrid, puzzle.clues.across[0]!, "across"),
    ).toBe("incomplete");
    expect(getCellWordStatus(puzzle, userGrid, 0, 0)).toBeNull();
  });
});

describe("isProtectedCrossingCell", () => {
  it("protects a letter when the other word is fully filled", () => {
    const userGrid = [
      "C", "A", "T", null, null,
      "O", null, null, null, null,
      "P", null, null, null, null,
      null, null, null, null, null,
      null, null, null, null, null,
    ];
    expect(isProtectedCrossingCell(puzzle, userGrid, 0, 0, "across")).toBe(
      true,
    );
    expect(isProtectedCrossingCell(puzzle, userGrid, 0, 0, "down")).toBe(
      true,
    );
    expect(isProtectedCrossingCell(puzzle, userGrid, 0, 1, "across")).toBe(
      false,
    );
  });

  it("does not protect when the other word is still incomplete", () => {
    const userGrid = [
      "C", "A", "T", null, null,
      "O", null, null, null, null,
      "", null, null, null, null,
      null, null, null, null, null,
      null, null, null, null, null,
    ];
    expect(isProtectedCrossingCell(puzzle, userGrid, 0, 0, "across")).toBe(
      false,
    );
  });
});
