import "dotenv/config";

import { Client } from "pg";

const dbChoiceRaw = process.env.USE_DATABASE?.toLowerCase();

const dbChoice = dbChoiceRaw === "shared" || dbChoiceRaw === "branch" ? dbChoiceRaw : "local";

const connectionByChoice = {
  shared: process.env.NEON_SHARED_DATABASE_URL,
  branch: process.env.NEON_BRANCH_DATABASE_URL,
  local: process.env.DATABASE_URL,
};

async function main() {
  const connectionString = connectionByChoice[dbChoice];

  if (!connectionString) {
    throw new Error(`No database URL configured for USE_DATABASE=${dbChoice}`);
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query("BEGIN");

    const currentRows = await client.query(`
      SELECT operator_id, league_id, neighborhood_id, rank, rep_score
      FROM standings_page_rows
      WHERE rank IN (3, 5, 7)
      ORDER BY rank
    `);

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - 30);
    const snapshotDate = targetDate.toISOString().slice(0, 10);

    const previousRankByCurrentRank = new Map([
      [3, 10],
      [5, 5],
      [7, 2],
    ]);

    for (const row of currentRows.rows) {
      const previousRank = previousRankByCurrentRank.get(Number(row.rank));

      if (previousRank == null) {
        continue;
      }

      await client.query(
        `
          INSERT INTO standings_history (
            snapshot_date,
            league_id,
            neighborhood_id,
            operator_id,
            rank,
            rep_score
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (snapshot_date, league_id, neighborhood_id, operator_id)
          DO UPDATE SET
            rank = EXCLUDED.rank,
            rep_score = EXCLUDED.rep_score
        `,
        [snapshotDate, row.league_id, row.neighborhood_id, row.operator_id, previousRank, row.rep_score],
      );
    }

    const verification = await client.query(`
      SELECT operator_id, rank AS current_rank, rank_delta_30d
      FROM standings_page_rows
      WHERE rank IN (3, 5, 7)
      ORDER BY rank
    `);

    console.log(`Using database: ${dbChoice}`);
    console.log(JSON.stringify({ snapshotDate, rows: verification.rows }, null, 2));

    await client.query("ROLLBACK");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
