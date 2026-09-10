import { describe, expect, it } from "vitest";
import { MIN_PUZZLE_WORDS, PUZZLE_GRID_SIZE } from "@/lib/api/schemas";
import { ANSWER_PATTERN } from "@/lib/clues/limits";
import { normalizeClues } from "@/lib/clues/normalize";
import { STORMIGHT_FIXTURE, STORMIGHT_FIXTURE_CLEAN } from "./fixtures";
import { packCrossword } from "./packer";
import { packFromBank } from "./pack-from-bank";

describe("packCrossword", () => {
  it("packs at least the minimum unique themed words on the fixed grid path", () => {
    const bank = normalizeClues(STORMIGHT_FIXTURE_CLEAN);
    expect(bank.length).toBeGreaterThanOrEqual(MIN_PUZZLE_WORDS);

    const puzzle = packFromBank("Stormlight Archive", bank, "medium");

    expect(puzzle).not.toBeNull();
    expect(puzzle!.size).toBeGreaterThanOrEqual(PUZZLE_GRID_SIZE);

    const entries = [...puzzle!.clues.across, ...puzzle!.clues.down];
    expect(entries.length).toBeGreaterThanOrEqual(MIN_PUZZLE_WORDS);

    const answers = entries.map((e) => e.answer);
    expect(new Set(answers).size).toBe(answers.length);

    for (const entry of entries) {
      expect(ANSWER_PATTERN.test(entry.answer)).toBe(true);
      expect(entry.clue.length).toBeGreaterThan(0);
    }
  });

  it("can pack directly when given enough budget on a larger board", () => {
    const bank = normalizeClues(STORMIGHT_FIXTURE_CLEAN);
    const puzzle = packCrossword("Stormlight Archive", bank, {
      size: 21,
      timeBudgetMs: 6000,
      minWords: MIN_PUZZLE_WORDS,
    });

    expect(puzzle).not.toBeNull();
    const entries = [...puzzle!.clues.across, ...puzzle!.clues.down];
    expect(entries.length).toBeGreaterThanOrEqual(MIN_PUZZLE_WORDS);
  });

  it("normalizes dirty fixture answers without duplicates", () => {
    const bank = normalizeClues(STORMIGHT_FIXTURE);
    expect(bank.every((c) => ANSWER_PATTERN.test(c.answer))).toBe(true);
    expect(new Set(bank.map((c) => c.answer)).size).toBe(bank.length);
  });
});

describe("packFromBank", () => {
  it("returns a puzzle with at least the minimum unique answers", () => {
    const bank = normalizeClues(STORMIGHT_FIXTURE_CLEAN);
    const puzzle = packFromBank("Stormlight Archive", bank, "medium");

    expect(puzzle).not.toBeNull();
    const entries = [...puzzle!.clues.across, ...puzzle!.clues.down];
    expect(entries.length).toBeGreaterThanOrEqual(MIN_PUZZLE_WORDS);
    expect(new Set(entries.map((e) => e.answer)).size).toBe(entries.length);
  });

  it("packs a 12-word bank without requiring 15 candidates", () => {
    const bank = normalizeClues(STORMIGHT_FIXTURE_CLEAN).slice(0, 12);
    expect(bank.length).toBe(MIN_PUZZLE_WORDS);

    const puzzle = packFromBank("Stormlight Archive", bank, "medium");

    expect(puzzle).not.toBeNull();
    const entries = [...puzzle!.clues.across, ...puzzle!.clues.down];
    expect(entries.length).toBeGreaterThanOrEqual(MIN_PUZZLE_WORDS);
    expect(new Set(entries.map((e) => e.answer)).size).toBe(entries.length);
  });
});
