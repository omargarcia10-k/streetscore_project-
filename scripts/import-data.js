import dotenv from "dotenv";
import pg from "pg";

import fs from "node:fs";
import path from "node:path";

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing from the .env file.");
}

const databaseMode = String(process.env.USE_DATABASE ?? "local");

let connectionString;

if (databaseMode === "shared") {
  connectionString = process.env.NEON_SHARED_DATABASE_URL;
} else if (databaseMode === "branch") {
  connectionString = process.env.NEON_BRANCH_DATABASE_URL;
} else {
  connectionString = process.env.DATABASE_URL;
}

if (!connectionString) {
  throw new Error(`No connection string configured for USE_DATABASE=${databaseMode}`);
}

console.log(`Using database: ${databaseMode}`);

const pool = new Pool({
  connectionString,
});

function readJsonFile(filename) {
  const filePath = path.join(process.cwd(), "data", filename);

  if (!fs.existsSync(filePath)) {
    throw new Error(`${filename} was not found.`);
  }

  const fileContents = fs.readFileSync(filePath, "utf8");
  const records = JSON.parse(fileContents);

  if (!Array.isArray(records)) {
    throw new Error(`${filename} must contain a JSON array.`);
  }

  return records;
}

async function importData() {
  const neighborhoods = readJsonFile("neighborhoods.json");
  const operators = readJsonFile("operators.json");
  const standingsEntries = readJsonFile("standings-entries.json");
  const scoreInputs = readJsonFile("score-inputs.json");

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /*
     * Confirm that the existing Auto league is present.
     */
    const leagueResult = await client.query(
      `
        SELECT league_id
        FROM leagues
        WHERE league_id = $1
      `,
      ["auto"],
    );

    if (leagueResult.rowCount === 0) {
      throw new Error('The existing league "auto" was not found in Neon.');
    }

    console.log('Existing league "auto" confirmed.');

    /*
     * IMPORT NEIGHBORHOODS
     */
    for (const neighborhood of neighborhoods) {
      await client.query(
        `
          INSERT INTO neighborhoods (
            neighborhood_id,
            league_id,
            zip_code,
            neighborhood_name
          )
          VALUES ($1, $2, $3, $4)

          ON CONFLICT (neighborhood_id)
          DO UPDATE SET
            league_id = EXCLUDED.league_id,
            zip_code = EXCLUDED.zip_code,
            neighborhood_name = EXCLUDED.neighborhood_name
        `,
        [neighborhood.neighborhoodId, neighborhood.leagueId, neighborhood.zipCode, neighborhood.neighborhoodName],
      );
    }

    console.log(`${neighborhoods.length} neighborhoods imported.`);

    /*
     * IMPORT OPERATORS
     */
    for (const operator of operators) {
      await client.query(
        `
          INSERT INTO operators (
            operator_id,
            operator_name,
            league_id,
            operator_type,
            is_verified,
            is_current_user,
            status
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7
          )

          ON CONFLICT (operator_id)
          DO UPDATE SET
            operator_name = EXCLUDED.operator_name,
            league_id = EXCLUDED.league_id,
            operator_type = EXCLUDED.operator_type,
            is_verified = EXCLUDED.is_verified,
            is_current_user = EXCLUDED.is_current_user,
            status = EXCLUDED.status
        `,
        [
          operator.operatorId,
          operator.operatorName,
          operator.leagueId,
          operator.operatorType,
          operator.isVerified,
          operator.isCurrentUser,
          operator.status,
        ],
      );
    }

    console.log(`${operators.length} operators imported.`);

    /*
     * IMPORT STANDINGS ENTRIES
     *
     * rank, rep_score and distance_miles
     * are placeholders until refresh_current_standings() recalculates current rankings.
     */
    for (const entry of standingsEntries) {
      await client.query(
        `
          INSERT INTO standings_entries (
            entry_id,
            season_id,
            time_window,
            league_id,
            neighborhood_id,
            zip_code,
            operator_id,
            distance_miles,
            rank,
            rep_score
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10
          )

          ON CONFLICT (entry_id)
          DO UPDATE SET
            season_id = EXCLUDED.season_id,
            time_window = EXCLUDED.time_window,
            league_id = EXCLUDED.league_id,
            neighborhood_id = EXCLUDED.neighborhood_id,
            zip_code = EXCLUDED.zip_code,
            operator_id = EXCLUDED.operator_id,
            distance_miles = EXCLUDED.distance_miles,
            rank = EXCLUDED.rank,
            rep_score = EXCLUDED.rep_score
        `,
        [
          entry.entryId,
          entry.seasonId,
          entry.timeWindow,
          entry.leagueId,
          entry.neighborhoodId,
          entry.zipCode,
          entry.operatorId,
          entry.distanceMiles ?? 0,
          entry.rank ?? 0,
          entry.repScore ?? 0,
        ],
      );
    }

    console.log(`${standingsEntries.length} standings entries imported.`);

    /*
     * IMPORT SCORE INPUTS
     *
     * volume_count, response_minutes and on_time_percent
     * are temporary placeholders for the current schema.
     */
    for (const scoreInput of scoreInputs) {
      await client.query(
        `
          INSERT INTO score_inputs (
            entry_id,
            volume_count,
            rating,
            review_count,
            response_minutes,
            on_time_percent,
            license_verified
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7
          )

          ON CONFLICT (entry_id)
          DO UPDATE SET
            volume_count = EXCLUDED.volume_count,
            rating = EXCLUDED.rating,
            review_count = EXCLUDED.review_count,
            response_minutes = EXCLUDED.response_minutes,
            on_time_percent = EXCLUDED.on_time_percent,
            license_verified = EXCLUDED.license_verified
        `,
        [
          scoreInput.entryId,
          scoreInput.volumeCount ?? 0,
          scoreInput.rating ?? 0,
          scoreInput.reviewCount ?? 0,
          scoreInput.responseMinutes ?? 0,
          scoreInput.onTimePercent ?? 0,
          scoreInput.licenseVerified === true,
        ],
      );
    }

    console.log(`${scoreInputs.length} score inputs imported.`);

    await client.query("COMMIT");

    console.log("");
    console.log("==============================");
    console.log("NORMALIZED IMPORT COMPLETE");
    console.log("==============================");
    console.log("League: auto");
    console.log(`Neighborhoods: ${neighborhoods.length}`);
    console.log(`Operators: ${operators.length}`);
    console.log(`Standings entries: ${standingsEntries.length}`);
    console.log(`Score inputs: ${scoreInputs.length}`);
    console.log("==============================");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

importData().catch((error) => {
  console.error("\nThe normalized import failed.\n");
  console.error(error);
  process.exitCode = 1;
});
