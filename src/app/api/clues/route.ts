import { NextResponse } from "next/server";
import { topicBodySchema } from "@/lib/api/schemas";
import { generateClueBank } from "@/lib/clues/generate";
import { normalizeClues } from "@/lib/clues/normalize";
import { STORMIGHT_FIXTURE_CLEAN } from "@/lib/crossword/fixtures";

export const runtime = "nodejs";
export const maxDuration = 60;
export const preferredRegion = "iad1";

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
  const exclude = normalizeClues(
    body.exclude.map((answer) => ({ answer, clue: answer })),
  ).map((c) => c.answer);
  const count = body.count ?? (exclude.length > 0 ? 10 : 20);

  try {
    if (!canUseNvidia) {
      const excluded = new Set(exclude);
      const clues = normalizeClues(STORMIGHT_FIXTURE_CLEAN).filter(
        (c) => !excluded.has(c.answer),
      );
      return NextResponse.json({
        topic: body.topic,
        clues,
        meta: {
          usedFixture: true,
          model: "fixture",
          clueCount: clues.length,
          timedOut: false,
          partial: false,
        },
      });
    }

    const { clues, timedOut } = await generateClueBank(body.topic, body.notes, {
      exclude,
      count,
      softStop: Math.min(count, exclude.length > 0 ? count : 18),
    });

    if (clues.length === 0) {
      return NextResponse.json(
        {
          error: timedOut
            ? "Clue generation timed out before any clues arrived. Try again."
            : "No valid clues generated. Try again.",
          stage: "clues",
        },
        { status: timedOut ? 504 : 500 },
      );
    }

    return NextResponse.json({
      topic: body.topic,
      clues,
      meta: {
        usedFixture: false,
        model: process.env.NVIDIA_MODEL?.trim() || "minimaxai/minimax-m3",
        clueCount: clues.length,
        timedOut,
        partial: timedOut || clues.length < count,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate clues";
    return NextResponse.json({ error: message, stage: "clues" }, { status: 500 });
  }
}
