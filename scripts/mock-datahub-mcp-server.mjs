#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";

const datasets = {
  standings_entries: {
    name: "standings_entries",
    kind: "table",
    description: "Current standings rows containing live REP Score and rank.",
    columns: [
      { name: "entry_id", dataType: "varchar(128)", nullable: false, description: "Primary key." },
      { name: "operator_id", dataType: "varchar(96)", nullable: false, description: "Operator identifier." },
      { name: "rep_score", dataType: "integer", nullable: false, description: "Current REP Score." },
      { name: "rank", dataType: "integer", nullable: false, description: "Current rank." },
    ],
    relationships: [
      {
        name: "standings_entries_operator_fk",
        fromDataset: "standings_entries",
        fromColumn: "operator_id",
        toDataset: "operators",
        toColumn: "operator_id",
        description: "Each standings row belongs to an operator.",
      },
    ],
  },
  score_inputs: {
    name: "score_inputs",
    kind: "table",
    description: "Raw score inputs consumed by REP Score calculation.",
    columns: [
      { name: "entry_id", dataType: "varchar(128)", nullable: false, description: "Foreign key to standings_entries." },
      { name: "rating", dataType: "numeric(2,1)", nullable: false, description: "Average rating." },
      { name: "review_count", dataType: "numeric", nullable: true, description: "Review count." },
      { name: "license_verified", dataType: "boolean", nullable: false, description: "License flag." },
    ],
    relationships: [
      {
        name: "score_inputs_entry_fk",
        fromDataset: "score_inputs",
        fromColumn: "entry_id",
        toDataset: "standings_entries",
        toColumn: "entry_id",
        description: "Each score input row maps to a standings entry.",
      },
    ],
  },
  standings_history: {
    name: "standings_history",
    kind: "table",
    description: "Historical rank and REP Score snapshots.",
    columns: [
      { name: "snapshot_date", dataType: "date", nullable: false, description: "Snapshot date." },
      { name: "operator_id", dataType: "varchar(96)", nullable: false, description: "Operator identifier." },
      { name: "rep_score", dataType: "integer", nullable: false, description: "Historical REP Score." },
      { name: "rank", dataType: "integer", nullable: false, description: "Historical rank." },
    ],
    relationships: [],
  },
  operators: {
    name: "operators",
    kind: "table",
    description: "Operator identity and status records.",
    columns: [
      { name: "operator_id", dataType: "varchar(96)", nullable: false, description: "Primary key." },
      { name: "operator_name", dataType: "varchar(120)", nullable: false, description: "Display name." },
      { name: "is_verified", dataType: "boolean", nullable: false, description: "Verification status." },
      { name: "status", dataType: "text", nullable: false, description: "Operator status." },
    ],
    relationships: [],
  },
};

const server = new McpServer({
  name: "streetscore-mock-datahub-mcp",
  version: "1.0.0",
});

server.registerTool(
  "get_dataset_metadata",
  {
    description: "Return DataHub-style dataset metadata for StreetScore datasets.",
    inputSchema: {
      datasetName: z.string().optional(),
      dataset: z.string().optional(),
      name: z.string().optional(),
      env: z.string().optional(),
    },
  },
  async ({ datasetName, dataset, name }) => {
    const requested = String(datasetName ?? dataset ?? name ?? "")
      .trim()
      .toLowerCase();
    const metadata = datasets[requested] ?? null;

    if (!metadata) {
      return {
        content: [{ type: "text", text: JSON.stringify({ dataset: null }) }],
        structuredContent: { dataset: null },
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify({ dataset: metadata }) }],
      structuredContent: { dataset: metadata },
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
