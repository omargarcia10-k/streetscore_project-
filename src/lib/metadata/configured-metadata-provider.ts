import { DataHubMetadataProvider } from "@/lib/metadata/datahub-metadata-provider";
import { localMetadataProvider } from "@/lib/metadata/local-metadata-provider";
import type { MetadataProvider } from "@/lib/metadata/metadata-provider";

export function getConfiguredMetadataProvider(): MetadataProvider {
  const graphqlUrl = process.env.DATAHUB_GRAPHQL_URL?.trim() || "http://localhost:9002/api/graphql";

  return new DataHubMetadataProvider({
    graphqlUrl,
    token: process.env.DATAHUB_TOKEN?.trim(),
    datasetEnv: process.env.DATAHUB_ENV?.trim() || "DEV",
    fallbackProvider: localMetadataProvider,
  });
}

export const metadataProvider = getConfiguredMetadataProvider();
