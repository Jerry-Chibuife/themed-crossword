import { NextResponse } from "next/server";
import { pickFallbackSparks } from "@/lib/topics/fallback";
import { generateTopicSparks } from "@/lib/topics/generate";

export const runtime = "nodejs";
export const maxDuration = 20;
export const preferredRegion = "iad1";

export async function POST() {
  const canUseNvidia = Boolean(process.env.NVIDIA_API_KEY);

  if (!canUseNvidia) {
    return NextResponse.json({
      sparks: pickFallbackSparks(),
      meta: { usedFixture: true },
    });
  }

  try {
    const sparks = await generateTopicSparks();
    return NextResponse.json({
      sparks,
      meta: {
        usedFixture: false,
        model: process.env.NVIDIA_MODEL?.trim() || "minimaxai/minimax-m3",
      },
    });
  } catch {
    return NextResponse.json({
      sparks: pickFallbackSparks(),
      meta: { usedFixture: true, fallbackReason: "generate_failed" },
    });
  }
}
