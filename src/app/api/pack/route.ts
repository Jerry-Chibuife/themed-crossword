import { NextResponse } from "next/server";
import { MIN_PUZZLE_WORDS, packBodySchema } from "@/lib/api/schemas";
import { normalizeClues } from "@/lib/clues/normalize";
import { packFromBank } from "@/lib/crossword/pack-from-bank";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  let body: ReturnType<typeof packBodySchema.parse>;
  try {
    body = packBodySchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid request body", stage: "pack" },
      { status: 400 },
    );
  }

  const candidates = normalizeClues(body.clues);
  if (candidates.length < MIN_PUZZLE_WORDS) {
    return NextResponse.json(
      { error: "Not enough valid clues to pack a puzzle", stage: "pack" },
      { status: 400 },
    );
  }

  try {
    const puzzle = packFromBank(body.topic, candidates, body.difficulty);
    if (!puzzle) {
      return NextResponse.json(
        { error: "Could not pack a crossword from the clue bank", stage: "pack" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      puzzle,
      meta: {
        clueCount: candidates.length,
        placed:
          puzzle.clues.across.length + puzzle.clues.down.length,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to pack crossword";
    return NextResponse.json({ error: message, stage: "pack" }, { status: 500 });
  }
}
