import dotenv from "dotenv";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "docker/datahub/.env"), override: false });

async function main() {
  const { buildDataHubIngestionEnv } = await import(
    new URL("../lib/metadata/datahub-database-target.ts", import.meta.url).href
  );
  const generated = buildDataHubIngestionEnv(process.env);
  const outputDirectory = path.resolve(process.cwd(), "docker/datahub");
  const outputFile = path.join(outputDirectory, ".generated-ingestion.env");

  const fileContents = Object.entries(generated)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(outputFile, `${fileContents}\n`, "utf8");

  console.log(`Prepared DataHub ingestion env for target: ${generated.DATABASE_TARGET}`);
  console.log(`Wrote ${outputFile}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
