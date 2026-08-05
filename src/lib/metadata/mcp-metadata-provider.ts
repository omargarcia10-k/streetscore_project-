import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import type {
  MetadataColumnInfo,
  MetadataDatasetInfo,
  MetadataProvider,
  MetadataRelationshipInfo,
} from "@/lib/metadata/metadata-provider";

type McpMetadataProviderOptions = {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  datasetEnv?: string;
  datasetToolName?: string;
  fallbackProvider?: MetadataProvider;
};

type RawMcpToolResult = {
  structuredContent?: Record<string, unknown>;
  content?: Array<
    | {
        type: "text";
        text: string;
      }
    | {
        type: string;
      }
  >;
  isError?: boolean;
};

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    return normalized === "true" || normalized === "1" || normalized === "yes";
  }

  return false;
}

function parseString(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return fallback;
}

function parseObjectFromTextBlocks(content: RawMcpToolResult["content"]): Record<string, unknown> | null {
  if (!content) {
    return null;
  }

  const text = content
    .filter((block): block is { type: "text"; text: string } => block.type === "text" && "text" in block)
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!text) {
    return null;
  }

  try {
    const parsed = JSON.parse(text) as unknown;

    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function parseColumns(payload: Record<string, unknown>): MetadataColumnInfo[] {
  const rawColumns = payload.columns ?? payload.fields ?? payload.schemaMetadata;

  if (!Array.isArray(rawColumns)) {
    return [];
  }

  return rawColumns
    .map((column) => {
      if (!column || typeof column !== "object") {
        return null;
      }

      const record = column as Record<string, unknown>;
      const name = parseString(record.name ?? record.fieldPath).trim();

      if (!name) {
        return null;
      }

      return {
        name,
        dataType: parseString(record.dataType ?? record.nativeDataType, "unknown"),
        nullable: parseBoolean(record.nullable),
        description: parseString(record.description),
      } satisfies MetadataColumnInfo;
    })
    .filter((column): column is MetadataColumnInfo => column !== null);
}

function parseRelationships(payload: Record<string, unknown>): MetadataRelationshipInfo[] {
  const rawRelationships = payload.relationships ?? payload.lineage ?? payload.edges;

  if (!Array.isArray(rawRelationships)) {
    return [];
  }

  return rawRelationships
    .map((relationship) => {
      if (!relationship || typeof relationship !== "object") {
        return null;
      }

      const record = relationship as Record<string, unknown>;
      const name = parseString(record.name).trim();
      const fromDataset = parseString(record.fromDataset ?? record.sourceDataset).trim();
      const toDataset = parseString(record.toDataset ?? record.targetDataset).trim();

      if (!name || !fromDataset || !toDataset) {
        return null;
      }

      return {
        name,
        fromDataset,
        fromColumn: parseString(record.fromColumn ?? record.sourceColumn, "*"),
        toDataset,
        toColumn: parseString(record.toColumn ?? record.targetColumn, "*"),
        description: parseString(record.description),
      } satisfies MetadataRelationshipInfo;
    })
    .filter((relationship): relationship is MetadataRelationshipInfo => relationship !== null);
}

function parseDatasetFromPayload(requestedName: string, payload: Record<string, unknown>): MetadataDatasetInfo | null {
  const source =
    (payload.dataset && typeof payload.dataset === "object" ? (payload.dataset as Record<string, unknown>) : null) ??
    (payload.data && typeof payload.data === "object" ? (payload.data as Record<string, unknown>) : null) ??
    payload;

  const name = parseString(source.name ?? source.datasetName, requestedName).trim();

  if (!name) {
    return null;
  }

  const kindValue = parseString(source.kind ?? source.type, "table").toLowerCase();
  const kind = kindValue === "view" ? "view" : "table";

  return {
    name,
    kind,
    description: parseString(source.description),
    columns: parseColumns(source),
    relationships: parseRelationships(source),
  };
}

export class McpMetadataProvider implements MetadataProvider {
  private readonly command: string;
  private readonly args: string[];
  private readonly env?: Record<string, string>;
  private readonly cwd?: string;
  private readonly datasetEnv: string;
  private readonly datasetToolName?: string;
  private readonly fallbackProvider?: MetadataProvider;

  private client: Client | null = null;
  private clientPromise: Promise<Client> | null = null;
  private discoveredToolName: string | null = null;

  constructor(options: McpMetadataProviderOptions) {
    this.command = options.command;
    this.args = options.args ?? [];
    this.env = options.env;
    this.cwd = options.cwd;
    this.datasetEnv = options.datasetEnv ?? "DEV";
    this.datasetToolName = options.datasetToolName;
    this.fallbackProvider = options.fallbackProvider;
  }

  private async getClient(): Promise<Client> {
    if (this.client) {
      return this.client;
    }

    if (this.clientPromise !== null) {
      return this.clientPromise;
    }

    this.clientPromise = (async () => {
      const client = new Client(
        {
          name: "streetscore-datahub-mcp-client",
          version: "1.0.0",
        },
        {
          capabilities: {},
        },
      );

      const transport = new StdioClientTransport({
        command: this.command,
        args: this.args,
        env: this.env,
        cwd: this.cwd,
        stderr: "pipe",
      });

      await client.connect(transport);
      this.client = client;

      return client;
    })();

    return this.clientPromise;
  }

  private async withFallback<T>(label: string, factory: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
    try {
      return await factory();
    } catch (error) {
      console.warn(`MCP metadata fallback for ${label}:`, error);

      return fallback();
    }
  }

  private async resolveDatasetToolName(): Promise<string> {
    if (this.datasetToolName?.trim()) {
      return this.datasetToolName.trim();
    }

    if (this.discoveredToolName) {
      return this.discoveredToolName;
    }

    const client = await this.getClient();
    const toolsResult = await client.listTools();

    const preferredPattern = /(dataset).*(metadata|schema)|metadata.*dataset|get.*dataset/i;
    const fallbackPattern = /dataset/i;

    const preferred = toolsResult.tools.find((tool) => preferredPattern.test(tool.name));
    const fallback = toolsResult.tools.find((tool) => fallbackPattern.test(tool.name));
    const selected = preferred ?? fallback;

    if (!selected) {
      throw new Error("Unable to discover an MCP dataset metadata tool. Set DATAHUB_MCP_DATASET_TOOL.");
    }

    this.discoveredToolName = selected.name;

    return selected.name;
  }

  private async callDatasetTool(datasetName: string): Promise<MetadataDatasetInfo | null> {
    const client = await this.getClient();
    const toolName = await this.resolveDatasetToolName();

    const response = (await client.callTool({
      name: toolName,
      arguments: {
        dataset: datasetName,
        datasetName,
        name: datasetName,
        env: this.datasetEnv,
      },
    })) as RawMcpToolResult;

    if (response.isError) {
      throw new Error(`MCP tool returned an error for dataset ${datasetName}.`);
    }

    const payload = response.structuredContent ?? parseObjectFromTextBlocks(response.content);

    if (!payload) {
      return null;
    }

    return parseDatasetFromPayload(datasetName, payload);
  }

  async listDatasets(): Promise<MetadataDatasetInfo[]> {
    const knownDatasets = this.fallbackProvider
      ? (await this.fallbackProvider.listDatasets()).map((dataset) => dataset.name)
      : [];

    const unique = [...new Set(knownDatasets.map((name) => normalizeName(name)))];

    const resolved = await Promise.all(
      unique.map(async (normalized) => {
        const sourceName = knownDatasets.find((name) => normalizeName(name) === normalized) ?? normalized;

        return this.getDatasetInfo(sourceName);
      }),
    );

    return resolved.filter((dataset): dataset is MetadataDatasetInfo => dataset !== null);
  }

  async getDatasetInfo(name: string): Promise<MetadataDatasetInfo | null> {
    return this.withFallback(
      `getDatasetInfo:${name}`,
      async () => this.callDatasetTool(name),
      async () => (this.fallbackProvider ? this.fallbackProvider.getDatasetInfo(name) : null),
    );
  }

  async listColumns(dataset: string): Promise<MetadataColumnInfo[]> {
    const info = await this.getDatasetInfo(dataset);

    return info?.columns ?? [];
  }

  async getColumnInfo(dataset: string, column: string): Promise<MetadataColumnInfo | null> {
    const columns = await this.listColumns(dataset);
    const normalized = normalizeName(column);

    return columns.find((item) => normalizeName(item.name) === normalized) ?? null;
  }

  async listRelationships(dataset?: string): Promise<MetadataRelationshipInfo[]> {
    if (!dataset) {
      const datasets = await this.listDatasets();

      return datasets.flatMap((item) => item.relationships);
    }

    const info = await this.getDatasetInfo(dataset);

    return info?.relationships ?? [];
  }
}
