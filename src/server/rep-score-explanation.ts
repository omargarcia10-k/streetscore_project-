import { query } from "@/lib/db";

type ExplanationQueryRow = {
  entry_id: string;
  operator_id: string;
  operator_name: string;
  league_id: string;
  neighborhood_id: string;
  neighborhood_name: string | null;
  time_window: string;
  score: number;
  rank: number;
  rating: number | string | null;
  review_count: number | string | null;
  volume_count: number | null;
  license_verified: boolean;
  operator_verified: boolean;
  status: string;
  rating_contribution: number | string;
  review_strength_contribution: number | string;
  license_verification_contribution: number | string;
  data_completeness_contribution: number | string;
  rank_delta_30d: number | null;
  previous_snapshot_date: string | null;
  previous_rank: number | null;
  previous_score: number | null;
  recent_history: Array<{
    snapshotDate: string;
    rank: number;
    score: number;
  }> | null;
};

export type RepScoreExplanationLookup =
  | {
      entryId: string;
      operatorId?: never;
    }
  | {
      entryId?: never;
      operatorId: string;
    };

export type RepScoreExplanationOptions = {
  leagueId?: string;
  neighborhoodId?: string;
  timeWindow?: string;
};

export type RepScoreExplanationComponent = {
  category: "Rating" | "Review Strength" | "License Verification" | "Data Completeness";
  value: number | boolean | null;
  contribution: number;
  maxContribution: number;
};

export type RepScoreHistorySnapshot = {
  snapshotDate: string;
  rank: number;
  score: number;
};

export type RepScoreExplanation = {
  entryId: string;
  operatorId: string;
  operatorName: string;
  leagueId: string;
  neighborhoodId: string;
  neighborhoodName: string | null;
  timeWindow: string;
  score: number;
  rank: number;
  status: string;
  inputs: {
    rating: number | null;
    reviewCount: number | null;
    volumeCount: number;
    licenseVerified: boolean;
  };
  verification: {
    licenseVerified: boolean;
    operatorVerified: boolean;
  };
  components: RepScoreExplanationComponent[];
  history: {
    rankDelta30d: number | null;
    scoreDelta30d: number | null;
    previousSnapshotDate: string | null;
    previousRank: number | null;
    previousScore: number | null;
    recentSnapshots: RepScoreHistorySnapshot[];
  };
};

function toNumber(value: number | string | null | undefined): number | null {
  if (value == null) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function toContribution(value: number | string): number {
  return Number(Number(value).toFixed(2));
}

export async function getRepScoreExplanation(
  lookup: RepScoreExplanationLookup,
  options: RepScoreExplanationOptions = {},
): Promise<RepScoreExplanation | null> {
  const entryId = "entryId" in lookup ? lookup.entryId : null;
  const operatorId = "operatorId" in lookup ? lookup.operatorId : null;
  const leagueId = options.leagueId ?? null;
  const neighborhoodId = options.neighborhoodId ?? null;
  const timeWindow = options.timeWindow ?? null;

  const result = await query<ExplanationQueryRow>(
    `
    WITH selected_entry AS (
      SELECT
        se.entry_id,
        se.operator_id,
        o.operator_name,
        se.league_id,
        se.neighborhood_id,
        n.neighborhood_name,
        se.time_window,
        se.rep_score AS score,
        se.rank,
        si.rating,
        si.review_count,
        COALESCE(si.volume_count, 0) AS volume_count,
        COALESCE(si.license_verified, false) AS license_verified,
        o.is_verified AS operator_verified,
        o.status,
        ROUND((COALESCE(si.rating, 0) / 5.0 * 50)::numeric, 2) AS rating_contribution,
        ROUND((
          CASE
            WHEN COALESCE(si.review_count, 0) > 0
            THEN LEAST(1::numeric, LN((si.review_count + 1)::numeric) / LN(1000::numeric)) * 30
            ELSE 0
          END
        )::numeric, 2) AS review_strength_contribution,
        CASE
          WHEN COALESCE(si.license_verified, false) = true THEN 15
          ELSE 0
        END AS license_verification_contribution,
        (
          CASE
            WHEN si.rating IS NOT NULL THEN 2
            ELSE 0
          END
          + CASE
            WHEN si.review_count IS NOT NULL THEN 2
            ELSE 0
          END
          + CASE
            WHEN si.license_verified IS NOT NULL THEN 1
            ELSE 0
          END
        ) AS data_completeness_contribution
      FROM standings_entries se
      JOIN operators o
        ON o.operator_id = se.operator_id
      JOIN neighborhoods n
        ON n.neighborhood_id = se.neighborhood_id
      LEFT JOIN score_inputs si
        ON si.entry_id = se.entry_id
      WHERE
        ($1::varchar IS NOT NULL AND se.entry_id = $1)
        OR ($2::varchar IS NOT NULL AND se.operator_id = $2)
      AND ($3::varchar IS NULL OR se.league_id = $3)
      AND ($4::varchar IS NULL OR se.neighborhood_id = $4)
      AND ($5::varchar IS NULL OR se.time_window = $5)
      ORDER BY se.rank ASC, se.rep_score DESC, se.entry_id ASC
      LIMIT 1
    )
    SELECT
      current_entry.entry_id,
      current_entry.operator_id,
      current_entry.operator_name,
      current_entry.league_id,
      current_entry.neighborhood_id,
      current_entry.neighborhood_name,
      current_entry.time_window,
      current_entry.score,
      current_entry.rank,
      current_entry.rating,
      current_entry.review_count,
      current_entry.volume_count,
      current_entry.license_verified,
      current_entry.operator_verified,
      current_entry.status,
      current_entry.rating_contribution,
      current_entry.review_strength_contribution,
      current_entry.license_verification_contribution,
      current_entry.data_completeness_contribution,
      movement.rank_delta_30d,
      previous_snapshot.snapshot_date::text AS previous_snapshot_date,
      previous_snapshot.rank AS previous_rank,
      previous_snapshot.rep_score AS previous_score,
      COALESCE(history.recent_history, '[]'::json) AS recent_history
    FROM selected_entry current_entry
    LEFT JOIN standings_rank_delta_30d() movement
      ON movement.league_id = current_entry.league_id
     AND movement.neighborhood_id = current_entry.neighborhood_id
     AND movement.operator_id = current_entry.operator_id
    LEFT JOIN standings_history previous_snapshot
      ON previous_snapshot.snapshot_date = CURRENT_DATE - 30
     AND previous_snapshot.league_id = current_entry.league_id
     AND previous_snapshot.neighborhood_id = current_entry.neighborhood_id
     AND previous_snapshot.operator_id = current_entry.operator_id
    LEFT JOIN LATERAL (
      SELECT json_agg(
        json_build_object(
          'snapshotDate', history_row.snapshot_date::text,
          'rank', history_row.rank,
          'score', history_row.rep_score
        )
        ORDER BY history_row.snapshot_date DESC
      ) AS recent_history
      FROM (
        SELECT
          snapshot_date,
          rank,
          rep_score
        FROM standings_history
        WHERE league_id = current_entry.league_id
          AND neighborhood_id = current_entry.neighborhood_id
          AND operator_id = current_entry.operator_id
        ORDER BY snapshot_date DESC
        LIMIT 5
      ) history_row
    ) history ON true
    `,
    [entryId, operatorId, leagueId, neighborhoodId, timeWindow],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  const rating = toNumber(row.rating);
  const reviewCount = toNumber(row.review_count);
  const previousScore = row.previous_score == null ? null : Number(row.previous_score);

  return {
    entryId: row.entry_id,
    operatorId: row.operator_id,
    operatorName: row.operator_name,
    leagueId: row.league_id,
    neighborhoodId: row.neighborhood_id,
    neighborhoodName: row.neighborhood_name,
    timeWindow: row.time_window,
    score: Number(row.score),
    rank: row.rank,
    status: row.status,
    inputs: {
      rating,
      reviewCount,
      volumeCount: Number(row.volume_count ?? 0),
      licenseVerified: row.license_verified,
    },
    verification: {
      licenseVerified: row.license_verified,
      operatorVerified: row.operator_verified,
    },
    components: [
      {
        category: "Rating",
        value: rating,
        contribution: toContribution(row.rating_contribution),
        maxContribution: 50,
      },
      {
        category: "Review Strength",
        value: reviewCount,
        contribution: toContribution(row.review_strength_contribution),
        maxContribution: 30,
      },
      {
        category: "License Verification",
        value: row.license_verified,
        contribution: toContribution(row.license_verification_contribution),
        maxContribution: 15,
      },
      {
        category: "Data Completeness",
        value: null,
        contribution: toContribution(row.data_completeness_contribution),
        maxContribution: 5,
      },
    ],
    history: {
      rankDelta30d: row.rank_delta_30d,
      scoreDelta30d: previousScore == null ? null : Number(row.score) - previousScore,
      previousSnapshotDate: row.previous_snapshot_date,
      previousRank: row.previous_rank,
      previousScore,
      recentSnapshots: row.recent_history ?? [],
    },
  };
}
