import { describe, expect, it } from "vitest";
import { MAX_ANSWER_LENGTH } from "@/lib/clues/limits";
import { answersConflict, normalizeClues } from "@/lib/clues/normalize";

describe("answersConflict", () => {
  it("detects exact matches and substantial prefixes", () => {
    expect(answersConflict("DESPACITO", "DESPACITO")).toBe(true);
    expect(answersConflict("DESPA", "DESPACITO")).toBe(true);
    expect(answersConflict("OLDTOWN", "OLDTOWNROAD")).toBe(true);
  });

  it("ignores short or weak prefixes that are distinct titles", () => {
    expect(answersConflict("CAT", "CATALYST")).toBe(false);
    expect(answersConflict("STAR", "START")).toBe(false);
    expect(answersConflict("A", "APPLE")).toBe(false);
  });

  it("detects near-miss spellings", () => {
    expect(answersConflict("SHALOW", "SHALLOW")).toBe(true);
    expect(answersConflict("THUNDA", "THUNDER")).toBe(true);
    expect(answersConflict("DYNAMIT", "DYNAMITE")).toBe(true);
    expect(answersConflict("UPTOFUNK", "UPTOWNFUNK")).toBe(true);
  });

  it("allows distinct titles", () => {
    expect(answersConflict("SHALLOW", "THUNDER")).toBe(false);
    expect(answersConflict("FLOWERS", "SHALLOW")).toBe(false);
  });

  it("treats close edit-distance peers as conflicts (intentional)", () => {
    // HOUSE/HORSE differ by one letter — still a near-miss for crossword banks.
    expect(answersConflict("HOUSE", "HORSE")).toBe(true);
  });
});

describe("normalizeClues", () => {
  it("keeps the longer form when a prefix duplicate appears", () => {
    const out = normalizeClues([
      { answer: "DESPA", clue: "Luis Fonsi smash" },
      { answer: "DESPACITO", clue: "Luis Fonsi & Daddy Yankee smash" },
    ]);
    expect(out.map((c) => c.answer)).toEqual(["DESPACITO"]);
  });

  it("keeps the better spelling for near-duplicates", () => {
    const out = normalizeClues([
      { answer: "SHALOW", clue: "Gaga duet (bad)" },
      { answer: "SHALLOW", clue: "Lady Gaga & Bradley Cooper duet" },
    ]);
    expect(out.map((c) => c.answer)).toEqual(["SHALLOW"]);
  });

  it("collapses exact duplicates", () => {
    const out = normalizeClues([
      { answer: "THUNDER", clue: "Imagine Dragons" },
      { answer: "thunder", clue: "Imagine Dragons again" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.answer).toBe("THUNDER");
  });

  it("drops over-length answers instead of truncating", () => {
    const tooLong = "A".repeat(MAX_ANSWER_LENGTH + 1);
    const out = normalizeClues([
      { answer: tooLong, clue: "too long" },
      { answer: "THUNDER", clue: "Imagine Dragons 2017 single" },
    ]);
    expect(out.map((c) => c.answer)).toEqual(["THUNDER"]);
    expect(out.every((c) => c.answer.length <= MAX_ANSWER_LENGTH)).toBe(true);
  });

  it("keeps distinct valid titles", () => {
    const out = normalizeClues([
      { answer: "SHALLOW", clue: "Lady Gaga & Bradley Cooper duet" },
      { answer: "THUNDER", clue: "Imagine Dragons 2017 single" },
    ]);
    expect(new Set(out.map((c) => c.answer))).toEqual(
      new Set(["SHALLOW", "THUNDER"]),
    );
  });
});
