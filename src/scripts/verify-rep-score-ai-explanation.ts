import type { AiTextGenerationRequest, AiTextGenerationResponse, AiTextProvider } from "../lib/ai/ai-text-provider";
import type { RepScoreExplanation, RepScoreHistorySnapshot } from "../server/rep-score-explanation";
import assert from "node:assert/strict";

class FakeAiTextProvider implements AiTextProvider {
  async generateText(request: AiTextGenerationRequest): Promise<AiTextGenerationResponse> {
    const scoreMatch = request.userPrompt.match(/- Score: (\d+)/);
    const score = scoreMatch ? Number(scoreMatch[1]) : null;
    const missingData = request.userPrompt.includes("Unavailable");

    let summary = "This REP Score reflects mixed signals from the provided data.";

    if (score != null && score >= 80) {
      summary = "This REP Score is strong because the provided contributors are consistently high.";
    } else if (score != null && score <= 40) {
      summary = "This REP Score is limited because several provided contributors are weak or missing.";
    }

    if (missingData) {
      summary += " Some supporting information is unavailable, so the explanation should stay cautious about gaps.";
    }

    return {
      text: `${summary} Strong contributors, weak contributors, and improvement opportunities are based only on the supplied breakdown.`,
      model: "fake-ai-provider",
    };
  }
}

const baseHistory: {
  rankDelta30d: number | null;
  scoreDelta30d: number | null;
  previousSnapshotDate: string | null;
  previousRank: number | null;
  previousScore: number | null;
  recentSnapshots: RepScoreHistorySnapshot[];
} = {
  rankDelta30d: null,
  scoreDelta30d: null,
  previousSnapshotDate: null,
  previousRank: null,
  previousScore: null,
  recentSnapshots: [],
};

const highScoreSample: RepScoreExplanation = {
  entryId: "entry-high",
  operatorId: "operator-high",
  operatorName: "High Score Auto",
  leagueId: "auto",
  neighborhoodId: "brooklyn",
  neighborhoodName: "Brooklyn",
  timeWindow: "last 30 days",
  score: 92,
  rank: 1,
  status: "active",
  inputs: {
    rating: 4.9,
    reviewCount: 280,
    volumeCount: 0,
    licenseVerified: true,
  },
  verification: {
    licenseVerified: true,
    operatorVerified: true,
  },
  components: [
    { category: "Rating", value: 4.9, contribution: 49, maxContribution: 50 },
    { category: "Review Strength", value: 280, contribution: 26, maxContribution: 30 },
    { category: "License Verification", value: true, contribution: 15, maxContribution: 15 },
    { category: "Data Completeness", value: null, contribution: 2, maxContribution: 5 },
  ],
  history: {
    rankDelta30d: 2,
    scoreDelta30d: 4,
    previousSnapshotDate: "2026-06-30",
    previousRank: 3,
    previousScore: 88,
    recentSnapshots: [
      { snapshotDate: "2026-07-30", rank: 1, score: 92 },
      { snapshotDate: "2026-06-30", rank: 3, score: 88 },
    ],
  },
};

const lowScoreSample: RepScoreExplanation = {
  entryId: "entry-low",
  operatorId: "operator-low",
  operatorName: "Low Score Auto",
  leagueId: "auto",
  neighborhoodId: "queens",
  neighborhoodName: "Queens",
  timeWindow: "last 30 days",
  score: 31,
  rank: 42,
  status: "inactive",
  inputs: {
    rating: 2.6,
    reviewCount: 4,
    volumeCount: 0,
    licenseVerified: false,
  },
  verification: {
    licenseVerified: false,
    operatorVerified: false,
  },
  components: [
    { category: "Rating", value: 2.6, contribution: 26, maxContribution: 50 },
    { category: "Review Strength", value: 4, contribution: 5, maxContribution: 30 },
    { category: "License Verification", value: false, contribution: 0, maxContribution: 15 },
    { category: "Data Completeness", value: null, contribution: 0, maxContribution: 5 },
  ],
  history: baseHistory,
};

const missingInfoSample: RepScoreExplanation = {
  entryId: "entry-missing",
  operatorId: "operator-missing",
  operatorName: "Missing Data Auto",
  leagueId: "auto",
  neighborhoodId: "bronx",
  neighborhoodName: null,
  timeWindow: "last 30 days",
  score: 18,
  rank: 75,
  status: "active",
  inputs: {
    rating: null,
    reviewCount: null,
    volumeCount: 0,
    licenseVerified: false,
  },
  verification: {
    licenseVerified: false,
    operatorVerified: false,
  },
  components: [
    { category: "Rating", value: null, contribution: 0, maxContribution: 50 },
    { category: "Review Strength", value: null, contribution: 0, maxContribution: 30 },
    { category: "License Verification", value: false, contribution: 0, maxContribution: 15 },
    { category: "Data Completeness", value: null, contribution: 1, maxContribution: 5 },
  ],
  history: baseHistory,
};

async function verifyScenario(label: string, sample: RepScoreExplanation) {
  const { localMetadataProvider } = await import(
    new URL("../lib/metadata/local-metadata-provider.ts", import.meta.url).href
  );
  const { createRepScoreAiExplanationPrompt, generateRepScoreAiExplanation } = await import(
    new URL("../server/rep-score-ai-explanation.ts", import.meta.url).href
  );

  const prompt = await createRepScoreAiExplanationPrompt(sample, localMetadataProvider);

  assert.match(prompt.user, /Dataset information/);
  assert.match(prompt.user, /Column meanings/);
  assert.match(prompt.user, /StreetScore metadata context/);
  assert.match(prompt.user, /Dataset: standings_entries/);
  assert.match(prompt.user, /Dataset: standings_page_rows/);
  assert.match(prompt.user, /Related datasets/);
  assert.match(prompt.user, /Lineage:/);
  assert.match(prompt.user, /Score value/);
  assert.match(prompt.user, /Score breakdown/);
  assert.match(prompt.user, /Ranking information/);
  assert.match(prompt.user, /Request:/);

  const result = await generateRepScoreAiExplanation({
    repScore: sample,
    metadataProvider: localMetadataProvider,
    aiTextProvider: new FakeAiTextProvider(),
  });

  assert.ok(result.explanation.length > 0);

  console.log(`\n[${label}]`);
  console.log(result.explanation);
}

async function main() {
  await verifyScenario("high-score", highScoreSample);
  await verifyScenario("low-score", lowScoreSample);
  await verifyScenario("missing-information", missingInfoSample);

  console.log("\nREP Score AI explanation verification passed.");
}

void main();
