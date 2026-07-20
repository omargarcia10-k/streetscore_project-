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
    const result = await client.query("SELECT * FROM refresh_current_standings_and_snapshot()");

    const summary = result.rows[0] ?? {
      reranked_entries: 0,
      inserted_snapshots: 0,
    };

    console.log(`Using database: ${dbChoice}`);
    console.log(`✓ ${summary.reranked_entries} rankings refreshed`);

    if (summary.inserted_snapshots === 0) {
      console.log("✓ Today's historical snapshot already exists; no duplicate rows inserted");
    } else {
      console.log(`✓ ${summary.inserted_snapshots} historical snapshots inserted`);
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
