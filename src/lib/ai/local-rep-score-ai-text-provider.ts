import type { AiTextGenerationRequest, AiTextGenerationResponse, AiTextProvider } from "@/lib/ai/ai-text-provider";

type ParsedContributor = {
  category: string;
  contribution: number;
  maxContribution: number;
  value: string;
};

type ParsedScoreContext = {
  operatorName: string;
  operatorId: string;
  score: number | null;
  rank: number | null;
  league: string;
  neighborhood: string;
  timeWindow: string;
  status: string;
};

function getSectionLines(prompt: string, heading: string): string[] {
  const lines = prompt.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === heading);

  if (start < 0) {
    return [];
  }

  const sectionLines: string[] = [];

  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.trim() === "") {
      break;
    }

    sectionLines.push(line);
  }

  return sectionLines;
}

function parseNumber(value: string): number | null {
  if (value.trim().toLowerCase() === "unavailable") {
    return null;
  }

  const numeric = Number(value);

  return Number.isFinite(numeric) ? numeric : null;
}

function parseScoreValue(lines: string[]): ParsedScoreContext {
  const data = new Map<string, string>();

  for (const line of lines) {
    const match = line.match(/^-\s*([^:]+):\s*(.*)$/);

    if (!match) {
      continue;
    }

    data.set(match[1].trim().toLowerCase(), match[2].trim());
  }

  const operatorRaw = data.get("operator") ?? "Unknown (unknown)";
  const operatorMatch = operatorRaw.match(/^(.*)\s+\(([^)]+)\)$/);

  return {
    operatorName: operatorMatch ? operatorMatch[1].trim() : operatorRaw,
    operatorId: operatorMatch ? operatorMatch[2].trim() : "unknown",
    score: parseNumber(data.get("score") ?? "Unavailable"),
    rank: parseNumber(data.get("rank") ?? "Unavailable"),
    league: data.get("league") ?? "Unavailable",
    neighborhood: data.get("neighborhood") ?? "Unavailable",
    timeWindow: data.get("time window") ?? "Unavailable",
    status: data.get("status") ?? "Unavailable",
  };
}

function parseContributor(line: string): ParsedContributor | null {
  const match = line.match(/^-\s*(.*?):\s*contribution=([-+]?\d*\.?\d+)\/([-+]?\d*\.?\d+),\s*value=(.*)$/);

  if (!match) {
    return null;
  }

  const contribution = Number(match[2]);
  const maxContribution = Number(match[3]);

  if (!Number.isFinite(contribution) || !Number.isFinite(maxContribution)) {
    return null;
  }

  return {
    category: match[1].trim(),
    contribution,
    maxContribution,
    value: match[4].trim(),
  };
}

function parseBreakdownContributor(line: string): ParsedContributor | null {
  const match = line.match(/^-\s*(.*?):\s*value=(.*),\s*contribution=([-+]?\d*\.?\d+)\/([-+]?\d*\.?\d+)$/);

  if (!match) {
    return null;
  }

  const contribution = Number(match[3]);
  const maxContribution = Number(match[4]);

  if (!Number.isFinite(contribution) || !Number.isFinite(maxContribution)) {
    return null;
  }

  return {
    category: match[1].trim(),
    contribution,
    maxContribution,
    value: match[2].trim(),
  };
}

function parseContributors(lines: string[]): ParsedContributor[] {
  return lines.map(parseContributor).filter((contributor): contributor is ParsedContributor => contributor !== null);
}

function parseBreakdownContributors(lines: string[]): ParsedContributor[] {
  return lines
    .map(parseBreakdownContributor)
    .filter((contributor): contributor is ParsedContributor => contributor !== null);
}

function parseOpportunitySignals(lines: string[]): string[] {
  return lines.map((line) => line.replace(/^-\s*/, "").trim()).filter((line) => line.length > 0);
}

function parseRankingLine(lines: string[], key: string): string {
  const lowerKey = key.toLowerCase();

  for (const line of lines) {
    const match = line.match(/^-\s*([^:]+):\s*(.*)$/);

    if (!match) {
      continue;
    }

    if (match[1].trim().toLowerCase() === lowerKey) {
      return match[2].trim();
    }
  }

  return "Unavailable";
}

function formatContributor(contributor: ParsedContributor): string {
  return `${contributor.category} (${contributor.contribution}/${contributor.maxContribution}, value: ${contributor.value})`;
}

function pickFallbackStrongest(contributors: ParsedContributor[]): ParsedContributor[] {
  return [...contributors]
    .sort((left, right) => {
      if (right.contribution !== left.contribution) {
        return right.contribution - left.contribution;
      }

      return left.category.localeCompare(right.category);
    })
    .slice(0, 2);
}

function pickFallbackWeakest(contributors: ParsedContributor[]): ParsedContributor[] {
  return [...contributors]
    .sort((left, right) => {
      if (left.contribution !== right.contribution) {
        return left.contribution - right.contribution;
      }

      return left.category.localeCompare(right.category);
    })
    .slice(0, 2);
}

function buildSummarySentence(context: ParsedScoreContext): string {
  const scorePart = context.score == null ? "an unavailable score" : `a REP Score of ${context.score}`;
  const rankPart = context.rank == null ? "an unavailable rank" : `rank ${context.rank}`;

  return [
    `${context.operatorName} (${context.operatorId}) currently has ${scorePart} at ${rankPart}.`,
    `This result is for league ${context.league}, neighborhood ${context.neighborhood}, over ${context.timeWindow}, with status ${context.status}.`,
  ].join(" ");
}

function buildStrengthSentence(strongest: ParsedContributor[]): string {
  if (strongest.length === 0) {
    return "The strongest contributor details are unavailable in the supplied prompt.";
  }

  if (strongest.length === 1) {
    return `The strongest contributor is ${formatContributor(strongest[0])}.`;
  }

  return `The strongest contributors are ${formatContributor(strongest[0])} and ${formatContributor(strongest[1])}.`;
}

function buildLimitingSentence(weakest: ParsedContributor[]): string {
  if (weakest.length === 0) {
    return "The weakest contributor details are unavailable in the supplied prompt.";
  }

  if (weakest.length === 1) {
    return `The main limiting factor is ${formatContributor(weakest[0])}.`;
  }

  return `The main limiting factors are ${formatContributor(weakest[0])} and ${formatContributor(weakest[1])}.`;
}

function buildOpportunitySentence(signals: string[]): string {
  if (signals.length === 0) {
    return "No explicit improvement opportunities were supplied.";
  }

  const topSignals = signals.slice(0, 3);

  return `Improvement opportunities based on supplied signals: ${topSignals.join(" ")}`;
}

function buildTrendSentence(rankingLines: string[]): string {
  const rankDelta30d = parseRankingLine(rankingLines, "Rank delta 30d");
  const scoreDelta30d = parseRankingLine(rankingLines, "Score delta 30d");
  const previousRank = parseRankingLine(rankingLines, "Previous rank");
  const previousScore = parseRankingLine(rankingLines, "Previous score");

  return [
    "Recent trend context:",
    `rank delta 30d = ${rankDelta30d},`,
    `score delta 30d = ${scoreDelta30d},`,
    `previous rank = ${previousRank},`,
    `previous score = ${previousScore}.`,
  ].join(" ");
}

export class LocalRepScoreAiTextProvider implements AiTextProvider {
  async generateText(request: AiTextGenerationRequest): Promise<AiTextGenerationResponse> {
    void request.systemPrompt;

    const scoreContext = parseScoreValue(getSectionLines(request.userPrompt, "Score value"));
    const strongestSection = parseContributors(getSectionLines(request.userPrompt, "Strongest contributors"));
    const weakestSection = parseContributors(getSectionLines(request.userPrompt, "Weakest contributors"));
    const breakdownSection = parseBreakdownContributors(getSectionLines(request.userPrompt, "Score breakdown"));
    const opportunitySignals = parseOpportunitySignals(
      getSectionLines(request.userPrompt, "Improvement opportunity signals"),
    );
    const rankingLines = getSectionLines(request.userPrompt, "Ranking information");

    const strongest = strongestSection.length > 0 ? strongestSection : pickFallbackStrongest(breakdownSection);
    const weakest = weakestSection.length > 0 ? weakestSection : pickFallbackWeakest(breakdownSection);

    const explanation = [
      buildSummarySentence(scoreContext),
      buildStrengthSentence(strongest),
      buildLimitingSentence(weakest),
      buildOpportunitySentence(opportunitySignals),
      buildTrendSentence(rankingLines),
    ].join("\n\n");

    return {
      text: explanation,
      model: "local-rep-score-deterministic-v1",
    };
  }
}
