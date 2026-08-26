import { NextResponse } from "next/server";
import {
  ClueGenerateError,
  classifyLlmError,
  httpStatusForClueCode,
  logClueError,
  messageForClueCode,
  nvidiaStatusFromError,
} from "@/lib/ai/errors";
import { getNvidiaModelId } from "@/lib/ai/nvidia";
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
      { error: "Invalid request body", stage: "clues", code: "failed" },
      { status: 400 },
    );
  }

  const canUseNvidia = Boolean(process.env.NVIDIA_API_KEY) && !body.useFixture;
  const exclude = normalizeClues(
    body.exclude.map((answer) => ({ answer, clue: answer })),
  ).map((c) => c.answer);
  const count = body.count ?? (exclude.length > 0 ? 12 : 30);

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
      softStop: count,
    });

    if (clues.length === 0) {
      const code = timedOut ? "timeout" : "empty";
      return NextResponse.json(
        {
          error: messageForClueCode(code),
          stage: "clues",
          code,
        },
        { status: httpStatusForClueCode(code) },
      );
    }

    return NextResponse.json({
      topic: body.topic,
      clues,
      meta: {
        usedFixture: false,
        model: getNvidiaModelId(),
        clueCount: clues.length,
        timedOut,
        partial: timedOut || clues.length < count,
      },
    });
  } catch (error) {
    const code =
      error instanceof ClueGenerateError
        ? error.code
        : classifyLlmError(error);
    const nvidiaStatus =
      error instanceof ClueGenerateError
        ? error.nvidiaStatus
        : nvidiaStatusFromError(error);
    const message =
      error instanceof ClueGenerateError
        ? error.message
        : messageForClueCode(code, getNvidiaModelId());
    if (!(error instanceof ClueGenerateError)) {
      logClueError("POST /api/clues", error, code);
    }
    return NextResponse.json(
      {
        error: message,
        stage: "clues",
        code,
        model: getNvidiaModelId(),
        ...(nvidiaStatus != null ? { nvidiaStatus } : {}),
      },
      { status: httpStatusForClueCode(code) },
    );
  }
}
