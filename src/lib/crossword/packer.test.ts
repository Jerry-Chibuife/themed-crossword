import { describe, expect, it } from "vitest";
import { normalizeClues } from "@/lib/clues/normalize";
import { STORMIGHT_FIXTURE, STORMIGHT_FIXTURE_CLEAN } from "./fixtures";
import { packCrossword } from "./packer";

describe("packCrossword", () => {
  it("packs a themed fixture into a playable puzzle", () => {
    const bank = normalizeClues(STORMIGHT_FIXTURE_CLEAN);
    const puzzle = packCrossword("Stormlight Archive", bank, {
      size: 15,
      timeBudgetMs: 3000,
      minWords: 8,
    });

    expect(puzzle).not.toBeNull();
    expect(puzzle!.size).toBeGreaterThanOrEqual(5);
    expect(puzzle!.clues.across.length + puzzle!.clues.down.length).toBeGreaterThanOrEqual(
      8,
    );

    for (const entry of [...puzzle!.clues.across, ...puzzle!.clues.down]) {
      expect(entry.answer.length).toBeGreaterThanOrEqual(3);
      expect(entry.clue.length).toBeGreaterThan(0);
    }
  });

  it("normalizes dirty fixture answers", () => {
    const bank = normalizeClues(STORMIGHT_FIXTURE);
    expect(bank.every((c) => /^[A-Z]{3,12}$/.test(c.answer))).toBe(true);
    expect(new Set(bank.map((c) => c.answer)).size).toBe(bank.length);
  });
});
