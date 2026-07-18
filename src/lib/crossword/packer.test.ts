import { describe, expect, it } from "vitest";
import { MIN_PUZZLE_WORDS } from "@/lib/api/schemas";
import { normalizeClues } from "@/lib/clues/normalize";
import { STORMIGHT_FIXTURE, STORMIGHT_FIXTURE_CLEAN } from "./fixtures";
import { packCrossword } from "./packer";

describe("packCrossword", () => {
  it("packs at least 15 unique themed words", () => {
    const bank = normalizeClues(STORMIGHT_FIXTURE_CLEAN);
    const puzzle = packCrossword("Stormlight Archive", bank, {
      size: 17,
      timeBudgetMs: 4000,
      minWords: MIN_PUZZLE_WORDS,
    });

    expect(puzzle).not.toBeNull();
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
    expect(bank.every((c) => /^[A-Z]{3,12}$/.test(c.answer))).toBe(true);
    expect(new Set(bank.map((c) => c.answer)).size).toBe(bank.length);
  });
});
