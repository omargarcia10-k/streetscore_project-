import type { MetadataColumnInfo, MetadataRelationshipInfo } from "@/lib/metadata/metadata-provider";

import assert from "node:assert/strict";
import path from "node:path";

async function main() {
  const { McpMetadataProvider } = await import(
    new URL("../lib/metadata/mcp-metadata-provider.ts", import.meta.url).href
  );
  const { localMetadataProvider } = await import(
    new URL("../lib/metadata/local-metadata-provider.ts", import.meta.url).href
  );

  const provider = new McpMetadataProvider({
    command: "node",
    args: [path.resolve(process.cwd(), "scripts/mock-datahub-mcp-server.mjs")],
    datasetToolName: "get_dataset_metadata",
    datasetEnv: "DEV",
    fallbackProvider: localMetadataProvider,
  });

  const dataset = await provider.getDatasetInfo("standings_entries");
  assert.ok(dataset);
  assert.equal(dataset?.name, "standings_entries");
  assert.ok(dataset?.columns.some((column: MetadataColumnInfo) => column.name === "rep_score"));

  const column = await provider.getColumnInfo("score_inputs", "review_count");
  assert.ok(column);
  assert.equal(column?.name, "review_count");

  const relationships = await provider.listRelationships("standings_entries");
  assert.ok(relationships.some((relationship: MetadataRelationshipInfo) => relationship.toDataset === "operators"));

  console.log("MCP metadata provider verification passed.");
}

void main();
