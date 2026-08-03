import assert from "node:assert/strict";

type EnvBuilder = (env: Record<string, string | undefined>) => Record<string, string>;

function verifyLocalTarget(buildDataHubIngestionEnv: EnvBuilder) {
  const result = buildDataHubIngestionEnv({
    DATABASE_TARGET: "local",
    DATABASE_URL: "postgresql://local_user@localhost:5432/streetscore_local",
  });

  assert.deepEqual(result, {
    DATABASE_TARGET: "local",
    POSTGRES_HOST: "localhost",
    POSTGRES_PORT: "5432",
    POSTGRES_DATABASE: "streetscore_local",
    POSTGRES_USERNAME: "local_user",
    POSTGRES_PASSWORD: "",
    POSTGRES_SSLMODE: "disable",
  });
}

function verifySharedTarget(buildDataHubIngestionEnv: EnvBuilder) {
  const result = buildDataHubIngestionEnv({
    DATABASE_TARGET: "shared",
    NEON_SHARED_DATABASE_URL:
      "postgresql://shared_user:shared_pass@ep-shared.neon.tech/neondb?sslmode=require&channel_binding=require",
  });

  assert.deepEqual(result, {
    DATABASE_TARGET: "shared",
    POSTGRES_HOST: "ep-shared.neon.tech",
    POSTGRES_PORT: "5432",
    POSTGRES_DATABASE: "neondb",
    POSTGRES_USERNAME: "shared_user",
    POSTGRES_PASSWORD: "shared_pass",
    POSTGRES_SSLMODE: "require",
  });
}

function verifyBranchTarget(buildDataHubIngestionEnv: EnvBuilder) {
  const result = buildDataHubIngestionEnv({
    DATABASE_TARGET: "branch",
    NEON_BRANCH_HOST: "ep-branch.neon.tech",
    NEON_BRANCH_PORT: "5432",
    NEON_BRANCH_DATABASE: "branchdb",
    NEON_BRANCH_USERNAME: "branch_user",
    NEON_BRANCH_PASSWORD: "branch_pass",
  });

  assert.deepEqual(result, {
    DATABASE_TARGET: "branch",
    POSTGRES_HOST: "ep-branch.neon.tech",
    POSTGRES_PORT: "5432",
    POSTGRES_DATABASE: "branchdb",
    POSTGRES_USERNAME: "branch_user",
    POSTGRES_PASSWORD: "branch_pass",
    POSTGRES_SSLMODE: "require",
  });
}

async function main() {
  const { buildDataHubIngestionEnv } = await import(
    new URL("../lib/metadata/datahub-database-target.ts", import.meta.url).href
  );

  verifyLocalTarget(buildDataHubIngestionEnv);
  verifySharedTarget(buildDataHubIngestionEnv);
  verifyBranchTarget(buildDataHubIngestionEnv);

  console.log("DataHub database target switching verification passed.");
}

void main();
