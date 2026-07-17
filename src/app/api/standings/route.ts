import { NextResponse } from "next/server";

import { query } from "@/lib/db";

type StandingRow = {
  entry_id: string;
  rank: number;
  operator_id: string;
  operator_name: string;
  league_id: string;
  league_name: string | null;
  neighborhood_id: string | null;
  neighborhood_name: string | null;
  zip_code: string;
  time_window: string;
  rep_score: number;
  rating: number | null;
  review_count: number | null;
  rank_delta_30d: number | null;
  distance_miles: number | string | null;
  status: "active" | "inactive";
  is_verified: boolean;
};

type MetricsRow = {
  total: string;
  active: string;
  verified: string;
};

function normalizeWindow(window: string): string {
  const normalizedWindow = window.trim().toLowerCase();

  if (normalizedWindow === "30d") {
    return "last 30 days";
  }

  return window;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const league = searchParams.get("league")?.trim();
  const neighborhood = searchParams.get("neighborhood")?.trim();
  const window = searchParams.get("window")?.trim() ?? "30d";
  const verified = searchParams.get("verified")?.trim() ?? "all";
  const limit = Number(searchParams.get("limit") ?? "10");

  if (!league) {
    return NextResponse.json({ error: "Missing required query param: league" }, { status: 400 });
  }

  if (!neighborhood) {
    return NextResponse.json({ error: "Missing required query param: neighborhood" }, { status: 400 });
  }

  const dbWindow = normalizeWindow(window);

  try {
    //
    // Leaderboard
    //
    const standingsResult = await query<StandingRow>(
      `
      SELECT
        entry_id,
        rank,
        operator_id,
        operator_name,
        league_id,
        league_name,
        neighborhood_id,
        neighborhood_name,
        zip_code,
        time_window,
        rep_score,
        rating,
        review_count,
        rank_delta_30d,
        distance_miles,
        status,
        is_verified
      FROM standings_page_rows
      WHERE league_id = $1
        AND neighborhood_name = $2
        AND time_window = $3
        AND (
          $4 = 'all'
          OR ($4 = 'verified' AND is_verified = true)
          OR ($4 = 'unverified' AND is_verified = false)
        )
      ORDER BY rank
      LIMIT $5;
      `,
      [league, neighborhood, dbWindow, verified, limit],
    );

    //
    // Dashboard metrics
    //
    const metricsResult = await query<MetricsRow>(
      `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN is_verified THEN 1 ELSE 0 END) AS verified
      FROM operators
      WHERE league_id = $1;
      `,
      [league],
    );

    const metrics = metricsResult.rows[0] ?? {
      total: "0",
      active: "0",
      verified: "0",
    };

    const rows = standingsResult.rows.map((row) => ({
      entryId: row.entry_id,
      rank: row.rank,
      operatorId: row.operator_id,
      name: row.operator_name,
      leagueId: row.league_id,
      leagueName: row.league_name,
      neighborhoodId: row.neighborhood_id,
      neighborhoodName: row.neighborhood_name,
      zipCode: row.zip_code,
      window: row.time_window,
      score: row.rep_score,
      rating: row.rating,
      reviewCount: row.review_count,
      rankDelta30d: row.rank_delta_30d,
      distanceMiles: Number(row.distance_miles),
      status: row.status,
      is_verified: row.is_verified,
    }));

    return NextResponse.json({
      league,
      neighborhood,
      window,
      metrics: {
        total: Number(metrics.total),
        active: Number(metrics.active),
        verified: Number(metrics.verified),
      },
      rows,
    });
  } catch (error) {
    console.error("Failed to load standings:", error);

    return NextResponse.json({ error: "Failed to load standings" }, { status: 500 });
  }
}
