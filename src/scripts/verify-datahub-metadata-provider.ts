import type { MetadataColumnInfo, MetadataRelationshipInfo } from "../lib/metadata/metadata-provider";
import assert from "node:assert/strict";

async function main() {
  const { DataHubMetadataProvider } = await import(
    new URL("../lib/metadata/datahub-metadata-provider.ts", import.meta.url).href
  );
  const { localMetadataProvider } = await import(
    new URL("../lib/metadata/local-metadata-provider.ts", import.meta.url).href
  );

  const fetchStub: typeof fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as { query?: string; variables?: Record<string, unknown> };
    const query = body.query ?? "";

    if (query.includes("SearchDatasets") && body.variables?.query === "standings_entries") {
      return new Response(
        JSON.stringify({
          data: {
            search: {
              searchResults: [
                {
                  entity: {
                    urn: "urn:li:dataset:(urn:li:dataPlatform:postgres,standings_entries,PROD)",
                    type: "DATASET",
                    name: "standings_entries",
                    properties: {
                      name: "standings_entries",
                      description: "Current standings rows in DataHub.",
                    },
                  },
                },
              ],
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (query.includes("SearchDatasets") && body.variables?.query === "standings_page_rows") {
      return new Response(
        JSON.stringify({
          data: {
            search: {
              searchResults: [
                {
                  entity: {
                    urn: "urn:li:dataset:(urn:li:dataPlatform:postgres,standings_page_rows,PROD)",
                    type: "DATASET",
                    name: "standings_page_rows",
                    properties: {
                      name: "standings_page_rows",
                      description: "Standings read model in DataHub.",
                    },
                  },
                },
              ],
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (
      query.includes("GetDataset") &&
      body.variables?.urn === "urn:li:dataset:(urn:li:dataPlatform:postgres,standings_entries,PROD)"
    ) {
      return new Response(
        JSON.stringify({
          data: {
            dataset: {
              urn: "urn:li:dataset:(urn:li:dataPlatform:postgres,standings_entries,PROD)",
              name: "standings_entries",
              properties: {
                name: "standings_entries",
                description: "Current standings rows in DataHub.",
              },
              editableProperties: {
                description: "Current standings rows captured from PostgreSQL ingestion.",
              },
              schemaMetadata: {
                fields: [
                  {
                    fieldPath: "entry_id",
                    description: "Primary key for the standings entry.",
                    nullable: false,
                    nativeDataType: "varchar(128)",
                  },
                  {
                    fieldPath: "rep_score",
                    description: "Current calculated REP Score.",
                    nullable: false,
                    nativeDataType: "integer",
                  },
                ],
              },
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (
      query.includes("GetDataset") &&
      body.variables?.urn === "urn:li:dataset:(urn:li:dataPlatform:postgres,standings_page_rows,PROD)"
    ) {
      return new Response(
        JSON.stringify({
          data: {
            dataset: {
              urn: "urn:li:dataset:(urn:li:dataPlatform:postgres,standings_page_rows,PROD)",
              name: "standings_page_rows",
              properties: {
                name: "standings_page_rows",
                description: "Standings page read model in DataHub.",
              },
              editableProperties: {
                description: "Joined standings view exposed to StreetScore leaderboard APIs.",
              },
              schemaMetadata: {
                fields: [
                  {
                    fieldPath: "operator_id",
                    description: "Operator identifier in the standings view.",
                    nullable: false,
                    nativeDataType: "varchar(96)",
                  },
                  {
                    fieldPath: "rep_score",
                    description: "REP Score surfaced to standings page consumers.",
                    nullable: false,
                    nativeDataType: "integer",
                  },
                ],
              },
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (query.includes("GetLineage")) {
      return new Response(
        JSON.stringify({
          data: {
            lineage: {
              relationships: [
                {
                  entity: {
                    urn: "urn:li:dataset:(urn:li:dataPlatform:postgres,score_inputs,PROD)",
                    type: "DATASET",
                    name: "score_inputs",
                    properties: {
                      name: "score_inputs",
                    },
                  },
                },
              ],
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ data: {} }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const provider = new DataHubMetadataProvider({
    graphqlUrl: "http://localhost:19002/api/graphql",
    fallbackProvider: localMetadataProvider,
    fetchImplementation: fetchStub,
  });

  const dataset = await provider.getDatasetInfo("standings_entries");
  assert.ok(dataset);
  assert.equal(dataset?.name, "standings_entries");
  assert.equal(dataset?.description, "Current standings rows captured from PostgreSQL ingestion.");
  assert.ok(dataset?.columns.some((column: MetadataColumnInfo) => column.name === "rep_score"));

  const repScoreColumn = await provider.getColumnInfo("standings_entries", "rep_score");
  assert.equal(repScoreColumn?.dataType, "integer");

  const relationships = await provider.listRelationships("standings_entries");
  assert.ok(
    relationships.some((relationship: MetadataRelationshipInfo) => relationship.toDataset === "standings_entries"),
  );

  const standingsPageRows = await provider.getDatasetInfo("standings_page_rows");
  assert.ok(standingsPageRows);
  assert.equal(standingsPageRows?.kind, "view");
  assert.ok(standingsPageRows?.columns.some((column: MetadataColumnInfo) => column.name === "rep_score"));

  console.log("DataHub metadata provider verification passed.");
}

void main();
