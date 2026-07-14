import { Pool, type QueryResultRow } from "pg";

// Determine which database connection to use
const dbChoiceRaw = process.env.USE_DATABASE?.toLowerCase();
const dbChoice = dbChoiceRaw === "shared" || dbChoiceRaw === "branch" ? dbChoiceRaw : "local";

const connectionByChoice = {
  shared: process.env.NEON_SHARED_DATABASE_URL,
  branch: process.env.NEON_BRANCH_DATABASE_URL,
  local: process.env.DATABASE_URL,
};

const labelByChoice = {
  shared: "Neon Cloud (Shared)",
  branch: "Neon Cloud (Your Branch)",
  local: "Local Database",
};

const connectionString = connectionByChoice[dbChoice];

if (!connectionString) {
  throw new Error(`No database URL configured for USE_DATABASE=${dbChoice}`);
}

const dbLabel = labelByChoice[dbChoice];

console.log("Connecting to:", dbLabel, "(", connectionString?.split("@")[1] || "unknown", ")");

const pool = new Pool({
  connectionString,
});

export async function query<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []) {
  return pool.query<T>(sql, params);
}
