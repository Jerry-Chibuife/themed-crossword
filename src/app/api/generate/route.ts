import { NextResponse } from "next/server";
import { z } from "zod";
import { generateClueBank } from "@/lib/clues/generate";
import { normalizeClues } from "@/lib/clues/normalize";
import { STORMIGHT_FIXTURE_CLEAN } from "@/lib/crossword/fixtures";
import { packCrossword } from "@/lib/crossword/packer";
import type { Puzzle } from "@/lib/crossword/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  topic: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(2000).optional().default(""),
  difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
  /** Dev/demo fallback when NVIDIA_API_KEY is missing */
  useFixture: z.boolean().optional().default(false),
});

type ErrorStage = "clues" | "pack";

function errorResponse(message: string, stage: ErrorStage, status = 500) {
  return NextResponse.json({ error: message, stage }, { status });
}

export async function POST(request: Request) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid request body", stage: "clues" },
      { status: 400 },
    );
  }

  const minWords = body.difficulty === "easy" ? 6 : body.difficulty === "hard" ? 10 : 8;
  const size = body.difficulty === "easy" ? 13 : 15;

  let candidates;
  const canUseNvidia = Boolean(process.env.NVIDIA_API_KEY) && !body.useFixture;

  try {
    if (canUseNvidia) {
      candidates = await generateClueBank(body.topic, body.notes);
    } else {
      // Fixture path for local demo / missing NVIDIA_API_KEY
      candidates = normalizeClues(STORMIGHT_FIXTURE_CLEAN);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate clues";
    return errorResponse(message, "clues");
  }

  let puzzle: Puzzle | null = null;
  try {
    puzzle = packCrossword(body.topic, candidates, {
      size,
      minWords,
      timeBudgetMs: 2800,
    });
    if (!puzzle) {
      // One shrink retry
      puzzle = packCrossword(body.topic, candidates, {
        size: Math.max(11, size - 2),
        minWords: Math.max(5, minWords - 2),
        timeBudgetMs: 2200,
      });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to pack crossword";
    return errorResponse(message, "pack");
  }

  if (!puzzle) {
    return errorResponse("Could not pack a crossword from the clue bank", "pack");
  }

  return NextResponse.json({
    puzzle,
    meta: {
      usedFixture: !canUseNvidia,
      clueCount: candidates.length,
    },
  });
}
