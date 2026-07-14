import { NextResponse } from "next/server";

import { query } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const ids = searchParams.get("ids")?.split(",");

  if (!ids) {
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
response_minutes,
on_time_percent,
status,
is_verified

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

      score: row.rep_score,

      rating: row.rating,

      responseMinutes: row.response_minutes,

      onTimePercent: row.on_time_percent,

      status: row.status,

      is_verified: row.is_verified,
    })),
  );
}
