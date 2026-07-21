import pg from "pg";

const { Pool } = pg;

const databaseMode = String(process.env.USE_DATABASE ?? "local");

let connectionString: string | undefined;

if (databaseMode === "shared") {
  connectionString = process.env.NEON_SHARED_DATABASE_URL;
} else if (databaseMode === "branch") {
  connectionString = process.env.NEON_BRANCH_DATABASE_URL;
} else {
  connectionString = process.env.DATABASE_URL;
}

if (!connectionString) {
  throw new Error(`Database URL missing for mode: ${databaseMode}`);
}

export const pool = new Pool({
  connectionString,
  ssl:
    databaseMode === "local"
      ? false
      : {
          rejectUnauthorized: false,
        },
});

export const query = (text: string, params?: unknown[]) => {
  return pool.query(text, params);
};
