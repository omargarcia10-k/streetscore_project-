import fs from "node:fs";
import path from "node:path";

async function fetchRepairShops() {
  const endpoint = "https://data.ny.gov/resource/icjc-x44x.json";

  const params = new URLSearchParams({
    $where: "upper(facility_city) = 'BROOKLYN'",
    $limit: "100",
    $order: "facility_name ASC",
  });

  const apiUrl = `${endpoint}?${params.toString()}`;

  console.log("Fetching Brooklyn repair shops...");

  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error(`NYS API request failed: ${response.status} ${response.statusText}`);
  }

  const repairShops = await response.json();

  if (!Array.isArray(repairShops) || repairShops.length === 0) {
    throw new Error("The NYS API returned no Brooklyn repair shops.");
  }

  console.log(`Downloaded ${repairShops.length} Brooklyn repair shops.`);

  /*
   * NEIGHBORHOODS
   *
   * One neighborhood record is created for each unique
   * Brooklyn ZIP code.
   */
  const neighborhoodMap = new Map();

  /*
   * OPERATORS
   *
   * Each NYS repair shop becomes one operator.
   */
  const operators = repairShops.map((shop) => {
    const facilityId = String(shop.facility ?? "unknown");

    const city = shop.facility_city?.trim() || "BROOKLYN";

    const zipCode = shop.facility_zip_code?.trim() || "Unknown";

    const neighborhoodId = `${city}-${zipCode}`.toLowerCase().replaceAll(" ", "-").replaceAll("/", "-");

    if (!neighborhoodMap.has(neighborhoodId)) {
      neighborhoodMap.set(neighborhoodId, {
        neighborhoodId,
        leagueId: "auto",
        zipCode,
        neighborhoodName: city,
      });
    }

    return {
      operatorId: `nys-${facilityId}`,

      operatorName: shop.facility_name?.trim() || "Not Available",

      leagueId: "auto",

      operatorType: shop.business_type?.trim() || "Repair Shop",

      /*
       * The shop appears in an official NYS DMV
       * repair-facility dataset.
       */
      isVerified: true,

      isCurrentUser: false,

      status: "active",
    };
  });

  const neighborhoods = Array.from(neighborhoodMap.values());

  const dataFolder = path.join(process.cwd(), "data");

  fs.mkdirSync(dataFolder, {
    recursive: true,
  });

  fs.writeFileSync(path.join(dataFolder, "neighborhoods.json"), JSON.stringify(neighborhoods, null, 2), "utf8");

  fs.writeFileSync(path.join(dataFolder, "operators.json"), JSON.stringify(operators, null, 2), "utf8");

  /*
   * Remove the old generated leagues file if it exists.
   * We are using the existing "auto" league in Neon.
   */
  const oldLeaguesFile = path.join(dataFolder, "leagues.json");

  if (fs.existsSync(oldLeaguesFile)) {
    fs.unlinkSync(oldLeaguesFile);
  }

  console.log("");
  console.log("====================================");
  console.log("NORMALIZED AUTOLEDGER FILES CREATED");
  console.log("====================================");
  console.log(`Neighborhoods: ${neighborhoods.length}`);
  console.log(`Operators: ${operators.length}`);
  console.log("League used: auto");
  console.log("====================================");
}

fetchRepairShops().catch((error) => {
  console.error("Could not create the Brooklyn repair-shop dataset.");
  console.error(error);
  process.exitCode = 1;
});
