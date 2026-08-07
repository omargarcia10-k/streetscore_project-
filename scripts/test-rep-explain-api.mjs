const baseUrl = process.env.STREETSCORE_URL?.trim() || "http://localhost:3000";

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request failed (${response.status}) for ${url}: ${body}`);
  }

  return response.json();
}

async function main() {
  const standingsUrl = `${baseUrl}/api/standings?league=auto&neighborhood=BROOKLYN&window=30d&verified=all&limit=1`;
  const standings = await fetchJson(standingsUrl);
  const rows = Array.isArray(standings?.rows) ? standings.rows : [];

  if (rows.length === 0) {
    throw new Error("No standings rows were returned. Confirm your database is seeded.");
  }

  const first = rows[0];

  if (!first?.operatorId && !first?.entryId) {
    throw new Error("Standings row does not include operatorId/entryId for explanation lookup.");
  }

  const explainParams = new URLSearchParams();

  if (first.entryId) {
    explainParams.set("entryId", String(first.entryId));
  } else {
    explainParams.set("operatorId", String(first.operatorId));
  }

  if (first.leagueId) {
    explainParams.set("leagueId", String(first.leagueId));
  }

  if (first.neighborhoodId) {
    explainParams.set("neighborhoodId", String(first.neighborhoodId));
  }

  if (first.window) {
    explainParams.set("timeWindow", String(first.window));
  }

  const explainUrl = `${baseUrl}/api/rep-score/explain?${explainParams.toString()}`;
  const explanation = await fetchJson(explainUrl);

  console.log(`StreetScore URL: ${baseUrl}`);
  console.log(`Standings probe URL: ${standingsUrl}`);
  console.log(`Explain URL: ${explainUrl}`);
  console.log("\nExplain response:\n");
  console.log(JSON.stringify(explanation, null, 2));
}

main().catch((error) => {
  console.error("REP explain smoke test failed:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
