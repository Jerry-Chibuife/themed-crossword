import { NextResponse } from "next/server";
import { getNvidiaModelId } from "@/lib/ai/nvidia";
import { pickFallbackSparks } from "@/lib/topics/fallback";
import { generateTopicSparks } from "@/lib/topics/generate";
import {
  loadServerSparksCache,
  saveServerSparksCache,
} from "@/lib/topics/server-cache";
import { topicSparksResponseSchema } from "@/lib/topics/types";

export const runtime = "nodejs";
export const maxDuration = 30;
export const preferredRegion = "iad1";

function fixtureResponse(fallbackReason?: string) {
  const sparks = pickFallbackSparks();
  return NextResponse.json({
    sparks,
    meta: {
      usedFixture: true,
      ...(fallbackReason ? { fallbackReason } : {}),
    },
  });
}

function aiResponse(sparks: ReturnType<typeof pickFallbackSparks>, cached: boolean) {
  const checked = topicSparksResponseSchema.safeParse({ sparks });
  if (!checked.success) {
    return fixtureResponse("invalid_payload");
  }
  return NextResponse.json({
    sparks: checked.data.sparks,
    meta: {
      usedFixture: false,
      cached,
      model: getNvidiaModelId(),
    },
  });
}

export async function POST() {
  const canUseNvidia = Boolean(process.env.NVIDIA_API_KEY);

  if (!canUseNvidia) {
    return fixtureResponse();
  }

  const cached = loadServerSparksCache();
  if (cached) {
    return aiResponse(cached, true);
  }

  try {
    const sparks = await generateTopicSparks();
    saveServerSparksCache(sparks);
    return aiResponse(sparks, false);
  } catch {
    return fixtureResponse("generate_failed");
  }
}
