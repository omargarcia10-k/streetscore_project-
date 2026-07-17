import fs from "node:fs";
import path from "node:path";

const dataDirectory = path.join(process.cwd(), "data");

function readJson(filename) {
  const filePath = path.join(dataDirectory, filename);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing file: ${filePath}`);
  }

  const contents = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(contents);

  if (!Array.isArray(data)) {
    throw new Error(`${filename} must contain a JSON array.`);
  }

  return data;
}

function writeJson(filename, data) {
  const filePath = path.join(dataDirectory, filename);

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");

  console.log(`Created ${filePath}`);
}

function extractZipCode(address) {
  if (!address) {
    return null;
  }

  const match = address.match(/\b\d{5}\b/);
  return match ? match[0] : null;
}

function getNeighborhoodZip(neighborhood) {
  return String(neighborhood.zipCode ?? neighborhood.zip_code ?? neighborhood.zip ?? "");
}

function getNeighborhoodId(neighborhood) {
  return neighborhood.neighborhoodId ?? neighborhood.neighborhood_id ?? null;
}

function buildStandingsData() {
  const operators = readJson("operators.json");
  const neighborhoods = readJson("neighborhoods.json");
  const enrichment = readJson("google-enrichment.json");

  const neighborhoodByZip = new Map();

  for (const neighborhood of neighborhoods) {
    const zipCode = getNeighborhoodZip(neighborhood);
    const neighborhoodId = getNeighborhoodId(neighborhood);

    if (zipCode && neighborhoodId) {
      neighborhoodByZip.set(zipCode, neighborhoodId);
    }
  }

  const operatorById = new Map(operators.map((operator) => [operator.operatorId ?? operator.operator_id, operator]));

  const standingsEntries = [];
  const scoreInputs = [];

  let skipped = 0;

  for (const record of enrichment) {
    const operatorId = record.operatorId ?? record.operator_id;

    const operator = operatorById.get(operatorId);

    if (!operator) {
      console.warn(`Skipping ${operatorId}: operator not found.`);
      skipped += 1;
      continue;
    }

    const zipCode = extractZipCode(record.matchedAddress);

    if (!zipCode) {
      console.warn(`Skipping ${operatorId}: ZIP code not found.`);
      skipped += 1;
      continue;
    }

    const neighborhoodId = neighborhoodByZip.get(zipCode);

    if (!neighborhoodId) {
      console.warn(`Skipping ${operatorId}: no neighborhood found for ZIP ${zipCode}.`);
      skipped += 1;
      continue;
    }

    const entryId = record.entryId ?? `entry-${operatorId}`;

    standingsEntries.push({
      entryId,
      seasonId: "2026-06",
      timeWindow: "last 30 days",
      leagueId: operator.leagueId ?? operator.league_id ?? "auto",
      neighborhoodId,
      zipCode,
      operatorId,

      // Temporary values required by the current schema.
      distanceMiles: 0,
      rank: standingsEntries.length + 1,
      repScore: 0,
      rankDelta30d: 0,
    });

    scoreInputs.push({
      entryId,

      // Temporary values required by the current schema.
      volumeCount: 0,
      responseMinutes: 0,
      onTimePercent: 0,

      rating: record.rating ?? 0,
      reviewCount: record.reviewCount ?? 0,
      licenseVerified: record.licenseVerified === true,
    });
  }

  writeJson("standings-entries.json", standingsEntries);

  writeJson("score-inputs.json", scoreInputs);

  console.log("");
  console.log("==============================");
  console.log("STANDINGS DATA CREATED");
  console.log("==============================");
  console.log(`Operators found: ${operators.length}`);
  console.log(`Enrichment records: ${enrichment.length}`);
  console.log(`Standings entries: ${standingsEntries.length}`);
  console.log(`Score inputs: ${scoreInputs.length}`);
  console.log(`Skipped records: ${skipped}`);
}

try {
  buildStandingsData();
} catch (error) {
  console.error("");
  console.error("Could not create standings data.");
  console.error(error.message);
  process.exitCode = 1;
}
