import { describe, expect, it } from "vitest";
import { extractObjectsFromText } from "@/lib/clues/generate";

describe("extractObjectsFromText", () => {
  it("parses NDJSON clue lines", () => {
    const text = [
      '{"answer":"ARRAKIS","clue":"Desert planet"}',
      '{"answer":"ATREIDES","clue":"Paul\'s house"}',
    ].join("\n");
    expect(extractObjectsFromText(text).map((c) => c.answer)).toEqual([
      "ARRAKIS",
      "ATREIDES",
    ]);
  });

  it("parses a JSON array, including markdown fences", () => {
    const text = `\`\`\`json
[{"answer":"HARKONNEN","clue":"Rival house"},{"answer":"CALADAN","clue":"Ocean world"}]
\`\`\``;
    expect(extractObjectsFromText(text).map((c) => c.answer).sort()).toEqual([
      "CALADAN",
      "HARKONNEN",
    ]);
  });

  it("parses a { clues: [...] } wrapper", () => {
    const text = JSON.stringify({
      clues: [{ answer: "SPICE", clue: "Melange" }],
    });
    expect(extractObjectsFromText(text).map((c) => c.answer)).toEqual(["SPICE"]);
  });
});
