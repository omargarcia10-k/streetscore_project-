import { NextResponse } from "next/server";

import { getConfiguredAiTextProvider } from "@/lib/ai/configured-ai-text-provider";
import { metadataProvider } from "@/lib/metadata";
import { generateRepScoreAiExplanation } from "@/server/rep-score-ai-explanation";
import { getRepScoreExplanation } from "@/server/rep-score-explanation";

function normalizeWindow(window: string | null): string | undefined {
  if (!window) {
    return undefined;
  }

  const normalizedWindow = window.trim().toLowerCase();

  if (!normalizedWindow) {
    return undefined;
  }

  if (normalizedWindow === "30d") {
    return "last 30 days";
  }

  return window.trim();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const entryId = searchParams.get("entryId")?.trim();
  const operatorId = searchParams.get("operatorId")?.trim();
  const leagueId = searchParams.get("leagueId")?.trim() || undefined;
  const neighborhoodId = searchParams.get("neighborhoodId")?.trim() || undefined;
  const timeWindow = normalizeWindow(searchParams.get("timeWindow"));

  if (!entryId && !operatorId) {
    return NextResponse.json({ error: "Missing required query param: entryId or operatorId" }, { status: 400 });
  }

  if (entryId && operatorId) {
    return NextResponse.json({ error: "Provide either entryId or operatorId, not both" }, { status: 400 });
  }

  const aiProviderResult = getConfiguredAiTextProvider();

  if (!aiProviderResult.provider) {
    return NextResponse.json({ error: aiProviderResult.reason }, { status: 503 });
  }

  try {
    const repScore = await getRepScoreExplanation(
      entryId
        ? {
            entryId,
          }
        : {
            operatorId: operatorId as string,
          },
      {
        leagueId,
        neighborhoodId,
        timeWindow,
      },
    );

    if (!repScore) {
      return NextResponse.json({ error: "REP Score explanation data not found" }, { status: 404 });
    }

    const aiExplanation = await generateRepScoreAiExplanation({
      repScore,
      metadataProvider,
      aiTextProvider: aiProviderResult.provider,
    });

    return NextResponse.json({
      entryId: repScore.entryId,
      operatorId: repScore.operatorId,
      operatorName: repScore.operatorName,
      score: repScore.score,
      rank: repScore.rank,
      explanation: aiExplanation.explanation,
      model: aiExplanation.model,
    });
  } catch (error) {
    console.error("Failed to generate REP Score explanation:", error);

    return NextResponse.json({ error: "Failed to generate REP Score explanation" }, { status: 500 });
  }
}
