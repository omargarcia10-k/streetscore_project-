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
    const checks = {
      objects: await client.query(`
        SELECT
          to_regclass('public.standings_history') AS standings_history,
          to_regclass('public.standings_page_rows') AS standings_page_rows
      `),
      indexes: await client.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'standings_history'
        ORDER BY indexname
      `),
      constraints: await client.query(`
        SELECT conname, contype
        FROM pg_constraint
        WHERE conrelid = 'standings_history'::regclass
        ORDER BY conname
      `),
      functions: await client.query(`
        SELECT proname, pg_get_function_identity_arguments(oid) AS args
        FROM pg_proc
        WHERE proname IN (
          'standings_rank_delta_30d',
          'snapshot_current_standings',
          'refresh_current_standings_and_snapshot'
        )
        ORDER BY proname
      `),
      historyCount: await client.query(`
        SELECT COUNT(*)::int AS count
        FROM standings_history
      `),
      standingsCount: await client.query(`
        SELECT COUNT(*)::int AS count
        FROM standings_entries
      `),
      operatorCount: await client.query(`
        SELECT COUNT(*)::int AS count
        FROM operators
      `),
      historySample: await client.query(`
        SELECT snapshot_date, operator_id, league_id, neighborhood_id, rank, rep_score
        FROM standings_history
        ORDER BY snapshot_date DESC, league_id, neighborhood_id, rank, operator_id
        LIMIT 10
      `),
      viewSample: await client.query(`
        SELECT *
        FROM standings_page_rows
        ORDER BY rank, operator_name
        LIMIT 10
      `),
    };

    console.log(`Using database: ${dbChoice}`);
    console.log(
      JSON.stringify(
        {
          objects: checks.objects.rows[0],
          indexes: checks.indexes.rows,
          constraints: checks.constraints.rows,
          functions: checks.functions.rows,
          counts: {
            standingsHistory: checks.historyCount.rows[0]?.count ?? 0,
            standingsEntries: checks.standingsCount.rows[0]?.count ?? 0,
            operators: checks.operatorCount.rows[0]?.count ?? 0,
          },
          historySample: checks.historySample.rows,
          viewSample: checks.viewSample.rows,
        },
        null,
        2,
      ),
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
