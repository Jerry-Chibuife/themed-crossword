import { NextResponse } from "next/server";
import { MIN_PUZZLE_WORDS, topicBodySchema } from "@/lib/api/schemas";
import { generateClueBank } from "@/lib/clues/generate";
import { normalizeClues } from "@/lib/clues/normalize";
import { STORMIGHT_FIXTURE_CLEAN } from "@/lib/crossword/fixtures";
import { packFromBank } from "@/lib/crossword/pack-from-bank";

/**
 * Legacy one-shot endpoint. Prefer /api/clues then /api/pack so the LLM
 * call and packing each get a clean function budget.
 */
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  let body: ReturnType<typeof topicBodySchema.parse>;
  try {
    body = topicBodySchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid request body", stage: "clues" },
      { status: 400 },
    );
  }

  const canUseNvidia = Boolean(process.env.NVIDIA_API_KEY) && !body.useFixture;

  let candidates;
  try {
    if (canUseNvidia) {
      const result = await generateClueBank(body.topic, body.notes, {
        count: 30,
      });
      candidates = result.clues;
      if (candidates.length < MIN_PUZZLE_WORDS) {
        return NextResponse.json(
          {
            error: `Only ${candidates.length} clues from one-shot generate; use the UI flow instead.`,
            stage: "clues",
          },
          { status: 500 },
        );
      }
    } else {
      candidates = normalizeClues(STORMIGHT_FIXTURE_CLEAN);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate clues";
    return NextResponse.json({ error: message, stage: "clues" }, { status: 500 });
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
        usedFixture: !canUseNvidia,
        clueCount: candidates.length,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to pack crossword";
    return NextResponse.json({ error: message, stage: "pack" }, { status: 500 });
  }
}
