import { DataHubMetadataProvider } from "@/lib/metadata/datahub-metadata-provider";
import { localMetadataProvider } from "@/lib/metadata/local-metadata-provider";
import { McpMetadataProvider } from "@/lib/metadata/mcp-metadata-provider";
import type { MetadataProvider } from "@/lib/metadata/metadata-provider";

function parseMcpArgs(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }

  const value = raw.trim();

  if (value.startsWith("[")) {
    try {
      const parsed = JSON.parse(value) as unknown;

      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item));
      }
    } catch {
      return value.split(/\s+/).filter(Boolean);
    }
  }

  return value.split(/\s+/).filter(Boolean);
}

export function getConfiguredMetadataProvider(): MetadataProvider {
  const providerMode = process.env.DATAHUB_METADATA_PROVIDER?.trim().toLowerCase();

  if (providerMode === "mcp") {
    const command = process.env.DATAHUB_MCP_SERVER_COMMAND?.trim();

    if (command) {
      return new McpMetadataProvider({
        command,
        args: parseMcpArgs(process.env.DATAHUB_MCP_SERVER_ARGS),
        cwd: process.env.DATAHUB_MCP_SERVER_CWD?.trim() || process.cwd(),
        datasetToolName: process.env.DATAHUB_MCP_DATASET_TOOL?.trim(),
        datasetEnv: process.env.DATAHUB_ENV?.trim() || "DEV",
        fallbackProvider: localMetadataProvider,
      });
    }

    console.warn(
      "DATAHUB_METADATA_PROVIDER is set to 'mcp' but DATAHUB_MCP_SERVER_COMMAND is missing. Using GraphQL provider.",
    );
  }

  const graphqlUrl = process.env.DATAHUB_GRAPHQL_URL?.trim() || "http://localhost:9002/api/graphql";

  return new DataHubMetadataProvider({
    graphqlUrl,
    token: process.env.DATAHUB_TOKEN?.trim(),
    datasetEnv: process.env.DATAHUB_ENV?.trim() || "DEV",
    fallbackProvider: localMetadataProvider,
  });
}

export const metadataProvider = getConfiguredMetadataProvider();
