import { NextResponse } from "next/server";

import { query } from "@/lib/db";

type StandingsPageRow = {
  entry_id: string;
  rank: number;
  operator_id: string;
  operator_name: string;
  operator_type: string | null;
  is_verified: boolean;
  is_current_user: boolean;
  status: string;
  league_id: string;
  league_name: string | null;
  volume_label: string | null;
  neighborhood_id: string | null;
  neighborhood_name: string | null;
  zip_code: string;
  time_window: string;
  rep_score: number;
  rating: number | null;
  review_count: number | null;
  volume_count: number | null;
  rank_delta_30d: number | null;
  distance_miles: number | string | null;
};

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const league = searchParams.get("league")?.trim() ?? "";
  const neighborhood = searchParams.get("neighborhood")?.trim() ?? "";
  const window = searchParams.get("window")?.trim() ?? "";
  const status = searchParams.get("status")?.trim().toLowerCase() ?? "all";
  const verified = searchParams.get("verified")?.trim().toLowerCase() ?? "all";
  const search = searchParams.get("search")?.trim() ?? "";
  const limit = Math.min(parsePositiveInt(searchParams.get("limit"), 5000), 10000);

  try {
    const result = await query<StandingsPageRow>(
      `
      SELECT
        entry_id,
        rank,
        operator_id,
        operator_name,
        operator_type,
        is_verified,
        is_current_user,
        status,
        league_id,
        league_name,
        volume_label,
        neighborhood_id,
        neighborhood_name,
        zip_code,
        time_window,
        rep_score,
        rating,
        review_count,
        volume_count,
        rank_delta_30d,
        distance_miles
      FROM standings_page_rows
      WHERE
        ($1 = '' OR league_id = $1)
        AND ($2 = '' OR neighborhood_name = $2)
        AND ($3 = '' OR time_window = $3)
        AND (
          $4 = 'all'
          OR ($4 = 'active' AND status = 'active')
          OR ($4 = 'inactive' AND status <> 'active')
        )
        AND (
          $5 = 'all'
          OR ($5 = 'verified' AND is_verified = true)
          OR ($5 = 'unverified' AND is_verified = false)
        )
        AND ($6 = '' OR operator_name ILIKE '%' || $6 || '%')
      ORDER BY rank ASC, operator_name ASC
      LIMIT $7;
      `,
      [league, neighborhood, window, status, verified, search, limit],
    );

    const rows = result.rows.map((row) => ({
      entryId: row.entry_id,
      rank: row.rank,
      operatorId: row.operator_id,
      operatorName: row.operator_name,
      operatorType: row.operator_type,
      isVerified: row.is_verified,
      isCurrentUser: row.is_current_user,
      status: row.status,
      leagueId: row.league_id,
      leagueName: row.league_name,
      volumeLabel: row.volume_label,
      neighborhoodId: row.neighborhood_id,
      neighborhoodName: row.neighborhood_name,
      zipCode: row.zip_code,
      timeWindow: row.time_window,
      repScore: row.rep_score,
      rating: row.rating,
      reviewCount: row.review_count,
      volumeCount: row.volume_count,
      rankDelta30d: row.rank_delta_30d,
      distanceMiles: row.distance_miles == null ? null : Number(row.distance_miles),
    }));

    return NextResponse.json({
      count: rows.length,
      rows,
    });
  } catch (error) {
    console.error("Failed to load standings rows:", error);
    return NextResponse.json({ error: "Failed to load standings rows" }, { status: 500 });
  }
}
