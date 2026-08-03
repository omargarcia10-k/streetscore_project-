import type { AiTextProvider } from "@/lib/ai/ai-text-provider";
import type { MetadataColumnInfo, MetadataDatasetInfo, MetadataProvider } from "@/lib/metadata";
import type { RepScoreExplanation, RepScoreExplanationComponent } from "@/server/rep-score-explanation";

const DEFAULT_METADATA_DATASETS = [
  "standings_entries",
  "standings_page_rows",
  "operators",
  "score_inputs",
  "neighborhoods",
  "standings_history",
] as const;

const HIGHLIGHTED_METADATA_COLUMNS: Record<string, string[]> = {
  standings_entries: ["rep_score", "rank", "neighborhood_id", "operator_id"],
  standings_page_rows: ["rep_score", "rank", "neighborhood_name", "operator_id"],
  operators: ["operator_id", "operator_name", "is_verified", "status"],
  score_inputs: ["entry_id", "rating", "review_count", "license_verified"],
  neighborhoods: ["neighborhood_id", "neighborhood_name", "zip_code", "league_id"],
  standings_history: ["snapshot_date", "rep_score", "rank", "operator_id"],
};

type RankedComponent = RepScoreExplanationComponent & {
  headroom: number;
};

export type RepScoreAiExplanationRequest = {
  repScore: RepScoreExplanation;
  metadataProvider: MetadataProvider;
  aiTextProvider: AiTextProvider;
  metadataDatasets?: string[];
};

export type RepScoreAiExplanationResult = {
  explanation: string;
  model: string;
  prompt: {
    system: string;
    user: string;
  };
};

function rankComponents(components: RepScoreExplanationComponent[]): RankedComponent[] {
  return [...components]
    .map((component) => ({
      ...component,
      headroom: Number((component.maxContribution - component.contribution).toFixed(2)),
    }))
    .sort((left, right) => {
      if (right.contribution !== left.contribution) {
        return right.contribution - left.contribution;
      }

      return left.category.localeCompare(right.category);
    });
}

function formatComponentValue(component: RepScoreExplanationComponent): string {
  if (component.value == null) {
    return "Unavailable";
  }

  if (typeof component.value === "boolean") {
    return component.value ? "Yes" : "No";
  }

  return String(component.value);
}

function createOpportunitySignals(repScore: RepScoreExplanation, components: RankedComponent[]): string[] {
  const signals: string[] = [];

  const reviewComponent = components.find((component) => component.category === "Review Strength");
  const ratingComponent = components.find((component) => component.category === "Rating");
  const completenessComponent = components.find((component) => component.category === "Data Completeness");
  const verificationComponent = components.find((component) => component.category === "License Verification");

  if ((repScore.inputs.reviewCount ?? 0) === 0) {
    signals.push("No review count is available, so review strength is limited by missing review volume.");
  } else if (reviewComponent && reviewComponent.headroom > 0) {
    signals.push("Review strength has remaining headroom based on the current review count.");
  }

  if ((repScore.inputs.rating ?? 0) > 0 && ratingComponent && ratingComponent.headroom > 0) {
    signals.push("Rating quality has remaining headroom because the current rating is below the maximum of 5.0.");
  }

  if (!repScore.inputs.licenseVerified && verificationComponent && verificationComponent.contribution === 0) {
    signals.push("License verification contributes no points because license verification is not currently present.");
  }

  if (completenessComponent && completenessComponent.headroom > 0) {
    const missingFields: string[] = [];

    if (repScore.inputs.rating == null) {
      missingFields.push("rating");
    }

    if (repScore.inputs.reviewCount == null) {
      missingFields.push("review count");
    }

    if (missingFields.length > 0) {
      signals.push(`Data completeness is reduced because ${missingFields.join(" and ")} is missing.`);
    } else {
      signals.push("Data completeness is below the maximum available contribution.");
    }
  }

  if (signals.length === 0) {
    signals.push("No obvious improvement gaps were detected from the provided data.");
  }

  return signals;
}

function formatDatasets(datasets: MetadataDatasetInfo[]): string {
  return datasets
    .map((dataset) => {
      const columns = dataset.columns.map((column) => `  - ${column.name}: ${column.description}`).join("\n");

      return [
        `- ${dataset.name} (${dataset.kind})`,
        `  Description: ${dataset.description}`,
        `  Columns:`,
        columns,
      ].join("\n");
    })
    .join("\n");
}

function formatRelevantColumns(columns: Array<{ dataset: string; column: MetadataColumnInfo | null }>): string {
  return columns
    .map(({ dataset, column }) => {
      if (!column) {
        return `- ${dataset}: unavailable`;
      }

      return `- ${dataset}.${column.name}: ${column.description} (type: ${column.dataType}, nullable: ${column.nullable ? "yes" : "no"})`;
    })
    .join("\n");
}

function formatHighlightedColumns(dataset: MetadataDatasetInfo): string {
  const preferredColumns = HIGHLIGHTED_METADATA_COLUMNS[dataset.name] ?? [];
  const selectedColumns = preferredColumns
    .map((columnName) => dataset.columns.find((column) => column.name === columnName))
    .filter((column): column is MetadataColumnInfo => column != null);

  const fallbackColumns = dataset.columns.slice(0, 4);
  const columns = selectedColumns.length > 0 ? selectedColumns : fallbackColumns;

  if (columns.length === 0) {
    return "- unavailable";
  }

  return columns.map((column) => `- ${column.name}: ${column.description || "No description available."}`).join("\n");
}

function formatRelatedDatasets(dataset: MetadataDatasetInfo): string {
  const relatedDatasets = [
    ...new Set(dataset.relationships.flatMap((relationship) => [relationship.fromDataset, relationship.toDataset])),
  ]
    .filter((name) => name !== dataset.name)
    .sort((left, right) => left.localeCompare(right));

  if (relatedDatasets.length === 0) {
    return "- unavailable";
  }

  return relatedDatasets.map((name) => `- ${name}`).join("\n");
}

function formatLineage(dataset: MetadataDatasetInfo): string {
  const lineageRelationships = dataset.relationships.filter(
    (relationship) =>
      relationship.description.toLowerCase().includes("lineage") ||
      relationship.fromColumn === "*" ||
      relationship.toColumn === "*",
  );

  if (lineageRelationships.length === 0) {
    return "- unavailable";
  }

  return lineageRelationships
    .map((relationship) => `- ${relationship.fromDataset} -> ${relationship.toDataset}: ${relationship.description}`)
    .join("\n");
}

function formatMetadataContext(datasets: MetadataDatasetInfo[]): string {
  return datasets
    .map((dataset) =>
      [
        `Dataset: ${dataset.name}`,
        `Kind: ${dataset.kind}`,
        `Description: ${dataset.description || "Unavailable"}`,
        "Important columns:",
        formatHighlightedColumns(dataset),
        "Related datasets:",
        formatRelatedDatasets(dataset),
        "Lineage:",
        formatLineage(dataset),
      ].join("\n"),
    )
    .join("\n\n");
}

async function buildMetadataContext(provider: MetadataProvider, datasetNames: string[]) {
  const datasetResults = await Promise.all(datasetNames.map((name) => provider.getDatasetInfo(name)));

  const datasets = datasetResults.filter((dataset): dataset is MetadataDatasetInfo => dataset !== null);

  const relevantColumns = await Promise.all([
    provider.getColumnInfo("standings_entries", "rep_score"),
    provider.getColumnInfo("standings_entries", "rank"),
    provider.getColumnInfo("score_inputs", "rating"),
    provider.getColumnInfo("score_inputs", "review_count"),
    provider.getColumnInfo("score_inputs", "license_verified"),
    provider.getColumnInfo("operators", "is_verified"),
    provider.getColumnInfo("standings_history", "rep_score"),
    provider.getColumnInfo("standings_history", "rank"),
  ]);

  return {
    datasets,
    columns: [
      { dataset: "standings_entries", column: relevantColumns[0] },
      { dataset: "standings_entries", column: relevantColumns[1] },
      { dataset: "score_inputs", column: relevantColumns[2] },
      { dataset: "score_inputs", column: relevantColumns[3] },
      { dataset: "score_inputs", column: relevantColumns[4] },
      { dataset: "operators", column: relevantColumns[5] },
      { dataset: "standings_history", column: relevantColumns[6] },
      { dataset: "standings_history", column: relevantColumns[7] },
    ],
  };
}

export async function createRepScoreAiExplanationPrompt(
  repScore: RepScoreExplanation,
  metadataProvider: MetadataProvider,
  metadataDatasets: string[] = [...DEFAULT_METADATA_DATASETS],
): Promise<{ system: string; user: string }> {
  const rankedComponents = rankComponents(repScore.components);
  const strongest = rankedComponents.slice(0, 2);
  const weakest = [...rankedComponents]
    .sort((left, right) => {
      if (left.contribution !== right.contribution) {
        return left.contribution - right.contribution;
      }

      return left.category.localeCompare(right.category);
    })
    .slice(0, 2)
    .map((component) => ({
      ...component,
      headroom: Number((component.maxContribution - component.contribution).toFixed(2)),
    }));

  const metadata = await buildMetadataContext(metadataProvider, metadataDatasets);
  const opportunities = createOpportunitySignals(repScore, rankedComponents);

  const system = [
    "You explain StreetScore REP Score results using only supplied data.",
    "Do not calculate REP Score.",
    "Do not invent weights, formulas, missing data, or database facts.",
    "If information is unavailable, say that it is unavailable.",
    "Explain why the current score exists, the strongest contributors, the weakest contributors, and improvement opportunities.",
  ].join(" ");

  const user = [
    "Dataset information",
    formatDatasets(metadata.datasets),
    "",
    "Column meanings",
    formatRelevantColumns(metadata.columns),
    "",
    "Score value",
    `- Operator: ${repScore.operatorName} (${repScore.operatorId})`,
    `- Score: ${repScore.score}`,
    `- Rank: ${repScore.rank}`,
    `- League: ${repScore.leagueId}`,
    `- Neighborhood: ${repScore.neighborhoodName ?? "Unavailable"}`,
    `- Time window: ${repScore.timeWindow}`,
    `- Status: ${repScore.status}`,
    "",
    "Score breakdown",
    ...repScore.components.map(
      (component) =>
        `- ${component.category}: value=${formatComponentValue(component)}, contribution=${component.contribution}/${component.maxContribution}`,
    ),
    "",
    "Strongest contributors",
    ...strongest.map(
      (component) =>
        `- ${component.category}: contribution=${component.contribution}/${component.maxContribution}, value=${formatComponentValue(component)}`,
    ),
    "",
    "Weakest contributors",
    ...weakest.map(
      (component) =>
        `- ${component.category}: contribution=${component.contribution}/${component.maxContribution}, value=${formatComponentValue(component)}`,
    ),
    "",
    "Improvement opportunity signals",
    ...opportunities.map((signal) => `- ${signal}`),
    "",
    "Ranking information",
    `- Rank delta 30d: ${repScore.history.rankDelta30d ?? "Unavailable"}`,
    `- Previous snapshot date: ${repScore.history.previousSnapshotDate ?? "Unavailable"}`,
    `- Previous rank: ${repScore.history.previousRank ?? "Unavailable"}`,
    `- Previous score: ${repScore.history.previousScore ?? "Unavailable"}`,
    `- Score delta 30d: ${repScore.history.scoreDelta30d ?? "Unavailable"}`,
    `- Recent snapshots: ${repScore.history.recentSnapshots.length === 0 ? "Unavailable" : JSON.stringify(repScore.history.recentSnapshots)}`,
    "",
    "StreetScore metadata context",
    formatMetadataContext(metadata.datasets),
    "",
    "Request:",
    "Explain this REP Score in plain English. Use only the provided information. Mention what most helps the score, what most limits it, and what could improve next.",
  ].join("\n");

  return { system, user };
}

export async function generateRepScoreAiExplanation({
  repScore,
  metadataProvider,
  aiTextProvider,
  metadataDatasets = [...DEFAULT_METADATA_DATASETS],
}: RepScoreAiExplanationRequest): Promise<RepScoreAiExplanationResult> {
  const prompt = await createRepScoreAiExplanationPrompt(repScore, metadataProvider, metadataDatasets);
  const response = await aiTextProvider.generateText({
    systemPrompt: prompt.system,
    userPrompt: prompt.user,
  });

  return {
    explanation: response.text,
    model: response.model,
    prompt,
  };
}
