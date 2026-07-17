import "dotenv/config";
import { execSync } from "node:child_process";

const file = process.argv[2];

if (!file) {
  console.error("Missing SQL migration file");
  process.exit(1);
}

const dbChoiceRaw = process.env.USE_DATABASE?.toLowerCase();

const dbChoice = dbChoiceRaw === "shared" || dbChoiceRaw === "branch" ? dbChoiceRaw : "local";

const connectionByChoice = {
  shared: process.env.NEON_SHARED_DATABASE_URL,
  branch: process.env.NEON_BRANCH_DATABASE_URL,
  local: process.env.DATABASE_URL,
};

const connectionString = connectionByChoice[dbChoice];

if (!connectionString) {
  throw new Error(`No database URL configured for USE_DATABASE=${dbChoice}`);
}

console.log(`Using database: ${dbChoice}`);
console.log(`Running SQL: ${file}`);

execSync(`psql "${connectionString}" -f "${file}"`, {
  stdio: "inherit",
});
