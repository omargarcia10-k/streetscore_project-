import dotenv from "dotenv";

import fs from "node:fs";
import path from "node:path";

dotenv.config();

const apiKey = process.env.GOOGLE_PLACES_API_KEY;

if (!apiKey) {
  throw new Error("GOOGLE_PLACES_API_KEY is missing from the .env file.");
}

const projectRoot = process.cwd();
const operatorsFile = path.join(projectRoot, "data", "operators.json");
const outputFile = path.join(projectRoot, "data", "google-enrichment.json");

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${filePath} was not found. Run the NYS fetch script first.`);
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

  if (!Array.isArray(data)) {
    throw new Error("operators.json must contain an array.");
  }

  return data;
}

function normalizeName(value = "") {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function calculateNameMatch(operatorName, googleName) {
  const source = normalizeName(operatorName);
  const result = normalizeName(googleName);

  if (!source || !result) {
    return "low";
  }

  if (source === result) {
    return "high";
  }

  if (source.includes(result) || result.includes(source)) {
    return "medium";
  }

  return "low";
}

async function searchGooglePlace(operator) {
  const textQuery = `${operator.operatorName}, Brooklyn, NY`;

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.rating",
        "places.userRatingCount",
      ].join(","),
    },
    body: JSON.stringify({
      textQuery,
      maxResultCount: 3,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(`Google request failed for ${operator.operatorName}: ` + `${response.status} ${errorBody}`);
  }

  const data = await response.json();
  const places = data.places ?? [];

  if (places.length === 0) {
    return {
      entryId: `entry-${operator.operatorId}`,
      operatorId: operator.operatorId,
      operatorName: operator.operatorName,
      rating: null,
      reviewCount: null,
      licenseVerified: true,
      googlePlaceId: null,
      matchedGoogleName: null,
      matchedAddress: null,
      matchConfidence: "none",
      matchStatus: "not_found",
    };
  }

  const bestPlace = places[0];

  return {
    entryId: `entry-${operator.operatorId}`,
    operatorId: operator.operatorId,
    operatorName: operator.operatorName,

    rating: typeof bestPlace.rating === "number" ? bestPlace.rating : null,

    reviewCount: Number.isInteger(bestPlace.userRatingCount) ? bestPlace.userRatingCount : null,

    licenseVerified: true,

    googlePlaceId: bestPlace.id ?? null,

    matchedGoogleName: bestPlace.displayName?.text ?? null,

    matchedAddress: bestPlace.formattedAddress ?? null,

    matchConfidence: calculateNameMatch(operator.operatorName, bestPlace.displayName?.text),

    matchStatus: "matched",
  };
}

async function enrichOperators() {
  const operators = readJsonFile(operatorsFile);

  // Start with only five businesses.
  const testOperators = operators;

  const enrichmentResults = [];

  console.log(`Searching Google Places for ${testOperators.length} businesses...`);

  for (let index = 0; index < testOperators.length; index += 1) {
    const operator = testOperators[index];

    console.log(`[${index + 1}/${testOperators.length}] ` + `Searching: ${operator.operatorName}`);

    try {
      const result = await searchGooglePlace(operator);

      enrichmentResults.push(result);

      console.log(`Result: ${result.matchStatus}, ` + `rating: ${result.rating}, ` + `reviews: ${result.reviewCount}`);
    } catch (error) {
      enrichmentResults.push({
        entryId: `entry-${operator.operatorId}`,
        operatorId: operator.operatorId,
        operatorName: operator.operatorName,
        rating: null,
        reviewCount: null,
        licenseVerified: true,
        googlePlaceId: null,
        matchedGoogleName: null,
        matchedAddress: null,
        matchConfidence: "none",
        matchStatus: "error",
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      console.error(error);
    }

    // Small delay between calls.
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  fs.writeFileSync(outputFile, JSON.stringify(enrichmentResults, null, 2), "utf8");

  console.log("");
  console.log("==============================");
  console.log("GOOGLE ENRICHMENT COMPLETE");
  console.log("==============================");
  console.log(`Results saved: ${enrichmentResults.length}`);
  console.log(`File: ${outputFile}`);
}

enrichOperators().catch((error) => {
  console.error("Google enrichment failed.");
  console.error(error);
  process.exitCode = 1;
});
