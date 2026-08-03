import assert from "node:assert/strict";

const REQUEST = {
  systemPrompt: "system",
  userPrompt: [
    "Score value",
    "- Operator: Deterministic Auto (op_local)",
    "- Score: 71",
    "- Rank: 6",
    "- League: auto",
    "- Neighborhood: Brooklyn",
    "- Time window: last 30 days",
    "- Status: active",
    "",
    "Strongest contributors",
    "- Rating: contribution=44/50, value=4.4",
    "- Review Strength: contribution=20/30, value=100",
    "",
    "Weakest contributors",
    "- License Verification: contribution=0/15, value=No",
    "- Data Completeness: contribution=2/5, value=Partial",
    "",
    "Improvement opportunity signals",
    "- License verification contributes no points because license verification is not currently present.",
    "- Data completeness is below the maximum available contribution.",
    "",
    "Ranking information",
    "- Rank delta 30d: 4",
    "- Previous snapshot date: 2026-07-01",
    "- Previous rank: 10",
    "- Previous score: 67",
    "- Score delta 30d: 4",
    "- Recent snapshots: []",
  ].join("\n"),
};

async function main() {
  const { LocalRepScoreAiTextProvider } = await import(
    new URL("../lib/ai/local-rep-score-ai-text-provider.ts", import.meta.url).href
  );

  const provider = new LocalRepScoreAiTextProvider();
  const first = await provider.generateText(REQUEST);
  const second = await provider.generateText(REQUEST);

  assert.equal(first.model, "local-rep-score-deterministic-v1");
  assert.equal(second.model, "local-rep-score-deterministic-v1");
  assert.equal(first.text, second.text, "Local provider output must be deterministic for the same prompt");

  assert.match(first.text, /The strongest contributors are Rating/i);
  assert.match(first.text, /The main limiting factors are License Verification/i);
  assert.match(first.text, /Improvement opportunities based on supplied signals:/i);
  assert.match(first.text, /Recent trend context:/i);

  console.log("Local REP Score AI provider deterministic-output verification passed.");
}

void main();
