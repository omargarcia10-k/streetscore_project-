import "dotenv/config";

import { Client } from "pg";

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const migrationsDir = path.resolve(process.cwd(), "migrations");
  const entries = await readdir(migrationsDir, { withFileTypes: true });
  const sqlFiles = entries
    .filter((entry) => entry.isFile() && /^\d+.*\.sql$/u.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  if (sqlFiles.length === 0) {
    throw new Error(`No SQL migration files found in ${migrationsDir}`);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    for (const fileName of sqlFiles) {
      const filePath = path.join(migrationsDir, fileName);
      const sql = await readFile(filePath, "utf8");

      console.log(`Applying ${fileName}`);
      await client.query(sql);
    }
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
