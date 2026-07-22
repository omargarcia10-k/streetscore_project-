import { NextResponse } from "next/server";

import { pool } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const result = await pool.query(
      `
  SELECT
  o.operator_id,
  o.operator_name,
  o.operator_type,
  o.status,
  o.is_verified,
  n.neighborhood_name,
  si.rating,
  si.review_count,
  se.rep_score,
  se.rank
  FROM operators o
  LEFT JOIN standings_entries se
    ON se.operator_id = o.operator_id
  LEFT JOIN neighborhoods n
    ON n.neighborhood_id = se.neighborhood_id
  LEFT JOIN score_inputs si
    ON si.entry_id = se.entry_id
  WHERE o.operator_id = $1
  LIMIT 1
  `,
      [id],
    );

    if (!result.rows[0]) {
      return NextResponse.json({ error: "Operator not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error(error);

    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
