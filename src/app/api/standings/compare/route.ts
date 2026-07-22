import { NextResponse } from "next/server";

import { query } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const ids = searchParams.get("ids")?.split(",");

  if (ids?.length !== 2) {
    return NextResponse.json([]);
  }

  const result = await query(
    `
    SELECT
      entry_id,
      operator_name,
      rank,
      rep_score,
      rating,
      review_count,
      status,
      is_verified,
      neighborhood_name

    FROM standings_page_rows

    WHERE entry_id = ANY($1)

    ORDER BY rank ASC
    `,
    [ids],
  );

  return NextResponse.json(
    result.rows.map((row) => ({
      entryId: row.entry_id,

      name: row.operator_name,

      rank: row.rank,

      score: Number(row.rep_score ?? 0),

      rating: row.rating ? Number(row.rating) : null,

      reviewCount: Number(row.review_count ?? 0),

      neighborhood: row.neighborhood_name ?? "-",

      status: row.status,

      is_verified: Boolean(row.is_verified),
    })),
  );
}
