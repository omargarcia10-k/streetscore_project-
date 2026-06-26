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
};

function normalizeWindow(window: string): string {
  const value = window.toLowerCase();

  if (value === "30d") {
    return "Last 30 days";
  }

  return window;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const league = searchParams.get("league")?.trim();
  const zip = searchParams.get("zip")?.trim();
  const window = searchParams.get("window")?.trim() ?? "30d";
  const dbWindow = normalizeWindow(window);

  if (!league || !zip) {
    return NextResponse.json({ error: "Missing required query params: league and zip" }, { status: 400 });
  }

  try {
    const result = await query<StandingRow>(
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
          status
        FROM standings_page_rows
        WHERE league_id = $1
          AND zip_code = $2
            AND time_window = $3
      `,
      [league, zip, dbWindow],
    );

    const rows = result.rows
      .slice()
      .sort((a, b) => a.rank - b.rank)
      .map((row) => ({
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
        distanceMiles:
          row.distance_miles === null
            ? null
            : typeof row.distance_miles === "number"
              ? row.distance_miles
              : Number(row.distance_miles),
        status: row.status,
      }));

    return NextResponse.json({
      league,
      zipCode: zip,
      window,
      rows,
    });
  } catch (error) {
    console.error("Failed to query standings page rows:", error);
    return NextResponse.json({ error: "Failed to load standings" }, { status: 500 });
  }
}
