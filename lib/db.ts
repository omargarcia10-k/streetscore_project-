import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type QueryResultRow } from "pg";

import * as schema from "../src/db/schema";

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

export const pool = new Pool({
  connectionString,
});

export const db = drizzle(pool, { schema });

export async function query<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []) {
  return pool.query<T>(sql, params);
}
