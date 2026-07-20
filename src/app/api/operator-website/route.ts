import { NextResponse } from "next/server";

import { readFile } from "node:fs/promises";
import path from "node:path";

type GoogleEnrichmentRow = {
  operatorId: string;
  operatorName: string;
  googlePlaceId: string | null;
  matchedGoogleName?: string | null;
  matchedAddress: string | null;
  websiteUri?: string | null;
};

let enrichmentRowsPromise: Promise<GoogleEnrichmentRow[]> | null = null;

async function loadEnrichmentRows() {
  if (!enrichmentRowsPromise) {
    const filePath = path.join(process.cwd(), "data", "google-enrichment.json");

    enrichmentRowsPromise = readFile(filePath, "utf8").then((content) => {
      const parsed = JSON.parse(content) as unknown;

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed as GoogleEnrichmentRow[];
    });
  }

  return enrichmentRowsPromise;
}

function buildMapsFallbackUrl(match: GoogleEnrichmentRow) {
  if (match.googlePlaceId) {
    return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(match.googlePlaceId)}`;
  }

  const query = match.matchedAddress ?? match.operatorName;

  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

async function fetchWebsiteUrlBySearch(match: GoogleEnrichmentRow) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return null;
  }

  const textQuery = [match.matchedGoogleName ?? match.operatorName, match.matchedAddress].filter(Boolean).join(", ");

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.websiteUri",
    },
    cache: "force-cache",
    body: JSON.stringify({
      textQuery,
      maxResultCount: 1,
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    places?: Array<{
      id?: string | null;
      websiteUri?: string | null;
    }>;
  };

  return data.places?.[0]?.websiteUri ?? null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const operatorId = searchParams.get("operatorId")?.trim();

  if (!operatorId) {
    return NextResponse.json({ error: "Missing operatorId" }, { status: 400 });
  }

  try {
    const enrichmentRows = await loadEnrichmentRows();
    const match = enrichmentRows.find((row) => row.operatorId === operatorId);

    if (!match) {
      return NextResponse.json({ error: "Operator website not found" }, { status: 404 });
    }

    const websiteUrl = match.websiteUri || (await fetchWebsiteUrlBySearch(match));
    const redirectUrl = websiteUrl || buildMapsFallbackUrl(match);

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("Failed to resolve operator website:", error);

    return NextResponse.json({ error: "Failed to resolve operator website" }, { status: 500 });
  }
}
