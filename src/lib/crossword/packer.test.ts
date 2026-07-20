import { describe, expect, it } from "vitest";
import { MIN_PUZZLE_WORDS, PUZZLE_GRID_SIZE } from "@/lib/api/schemas";
import { normalizeClues } from "@/lib/clues/normalize";
import { STORMIGHT_FIXTURE, STORMIGHT_FIXTURE_CLEAN } from "./fixtures";
import { packCrossword } from "./packer";
import { packFromBank } from "./pack-from-bank";

describe("packCrossword", () => {
  it("packs at least 24 unique themed words on a 19×19 grid", () => {
    const bank = normalizeClues(STORMIGHT_FIXTURE_CLEAN);
    expect(bank.length).toBeGreaterThanOrEqual(MIN_PUZZLE_WORDS);

    const puzzle = packCrossword("Stormlight Archive", bank, {
      size: PUZZLE_GRID_SIZE,
      timeBudgetMs: 5000,
      minWords: MIN_PUZZLE_WORDS,
    });

    expect(puzzle).not.toBeNull();
    expect(puzzle!.size).toBe(PUZZLE_GRID_SIZE);

    const entries = [...puzzle!.clues.across, ...puzzle!.clues.down];
    expect(entries.length).toBeGreaterThanOrEqual(MIN_PUZZLE_WORDS);

    const answers = entries.map((e) => e.answer);
    expect(new Set(answers).size).toBe(answers.length);

    for (const entry of entries) {
      expect(entry.answer.length).toBeGreaterThanOrEqual(3);
      expect(entry.clue.length).toBeGreaterThan(0);
    }
  });

  it("normalizes dirty fixture answers without duplicates", () => {
    const bank = normalizeClues(STORMIGHT_FIXTURE);
    expect(bank.every((c) => /^[A-Z]{3,15}$/.test(c.answer))).toBe(true);
    expect(new Set(bank.map((c) => c.answer)).size).toBe(bank.length);
  });
});

describe("packFromBank", () => {
  it("returns a puzzle with at least 24 unique answers", () => {
    const bank = normalizeClues(STORMIGHT_FIXTURE_CLEAN);
    const puzzle = packFromBank("Stormlight Archive", bank, "medium");

    expect(puzzle).not.toBeNull();
    const entries = [...puzzle!.clues.across, ...puzzle!.clues.down];
    expect(entries.length).toBeGreaterThanOrEqual(MIN_PUZZLE_WORDS);
    expect(new Set(entries.map((e) => e.answer)).size).toBe(entries.length);
  });
});
