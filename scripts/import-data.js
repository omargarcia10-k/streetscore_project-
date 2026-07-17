import dotenv from "dotenv";
import pg from "pg";

import fs from "node:fs";
import path from "node:path";

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing from the .env file.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function readJsonFile(filename) {
  const filePath = path.join(process.cwd(), "data", filename);

  if (!fs.existsSync(filePath)) {
    throw new Error(`${filename} was not found. Run fetch-repair-shops.js first.`);
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

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /*
     * Confirm that the existing Auto league is present.
     * We do not create or change the league.
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
     *
     * ZIP code and neighborhood name belong here.
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
                    league_id =
                        EXCLUDED.league_id,
                    zip_code =
                        EXCLUDED.zip_code,
                    neighborhood_name =
                        EXCLUDED.neighborhood_name
                `,
        [neighborhood.neighborhoodId, neighborhood.leagueId, neighborhood.zipCode, neighborhood.neighborhoodName],
      );
    }

    console.log(`${neighborhoods.length} neighborhoods imported.`);

    /*
     * IMPORT OPERATORS
     *
     * Only business identity fields belong here.
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
                    operator_name =
                        EXCLUDED.operator_name,
                    league_id =
                        EXCLUDED.league_id,
                    operator_type =
                        EXCLUDED.operator_type,
                    is_verified =
                        EXCLUDED.is_verified,
                    is_current_user =
                        EXCLUDED.is_current_user,
                    status =
                        EXCLUDED.status
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

    await client.query("COMMIT");

    console.log("");
    console.log("==============================");
    console.log("NORMALIZED IMPORT COMPLETE");
    console.log("==============================");
    console.log("League: auto");
    console.log(`Neighborhoods: ${neighborhoods.length}`);
    console.log(`Operators: ${operators.length}`);
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
  console.error("The normalized import failed.");
  console.error(error);
  process.exitCode = 1;
});
