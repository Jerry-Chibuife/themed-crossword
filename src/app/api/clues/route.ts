import { NextResponse } from "next/server";
import { topicBodySchema } from "@/lib/api/schemas";
import { generateClueBank } from "@/lib/clues/generate";
import { normalizeClues } from "@/lib/clues/normalize";
import { STORMIGHT_FIXTURE_CLEAN } from "@/lib/crossword/fixtures";

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

  try {
    const clues = canUseNvidia
      ? await generateClueBank(body.topic, body.notes)
      : normalizeClues(STORMIGHT_FIXTURE_CLEAN);

    return NextResponse.json({
      topic: body.topic,
      clues,
      meta: {
        usedFixture: !canUseNvidia,
        model: canUseNvidia
          ? process.env.NVIDIA_MODEL?.trim() || "minimaxai/minimax-m3"
          : "fixture",
        clueCount: clues.length,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate clues";
    const timedOut =
      error instanceof Error &&
      (error.name === "TimeoutError" || /timed out/i.test(error.message));
    return NextResponse.json(
      {
        error: timedOut
          ? "Clue generation timed out. Try again with a shorter topic."
          : message,
        stage: "clues",
      },
      { status: timedOut ? 504 : 500 },
    );
  }
}
