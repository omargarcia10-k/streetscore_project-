import type {
  MetadataColumnInfo,
  MetadataDatasetInfo,
  MetadataProvider,
  MetadataRelationshipInfo,
} from "@/lib/metadata/metadata-provider";

type DataHubSearchResponse = {
  search?: {
    searchResults?: Array<{
      entity?: {
        urn?: string;
        type?: string;
        name?: string | null;
        properties?: {
          name?: string | null;
          description?: string | null;
        } | null;
      } | null;
    }>;
  };
};

type DataHubDatasetResponse = {
  dataset?: {
    urn?: string;
    name?: string | null;
    properties?: {
      name?: string | null;
      description?: string | null;
    } | null;
    editableProperties?: {
      description?: string | null;
    } | null;
    schemaMetadata?: {
      fields?: Array<{
        fieldPath?: string | null;
        description?: string | null;
        nullable?: boolean | null;
        nativeDataType?: string | null;
      } | null>;
    } | null;
  } | null;
};

type DataHubLineageResponse = {
  lineage?: {
    relationships?: Array<{
      entity?: {
        urn?: string;
        type?: string;
        name?: string | null;
        properties?: {
          name?: string | null;
        } | null;
      } | null;
    }>;
  } | null;
};

type DataHubGraphQlResponse<TData> = {
  data?: TData;
  errors?: Array<{
    message?: string;
  }>;
};

type DataHubMetadataProviderOptions = {
  graphqlUrl: string;
  token?: string;
  datasetEnv?: string;
  fallbackProvider?: MetadataProvider;
  fetchImplementation?: typeof fetch;
};

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function uniqueByName<T extends { name: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    const key = normalizeName(item.name);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(item);
  }

  return result;
}

function uniqueRelationships(items: MetadataRelationshipInfo[]): MetadataRelationshipInfo[] {
  const seen = new Set<string>();
  const result: MetadataRelationshipInfo[] = [];

  for (const item of items) {
    const key = [item.name, item.fromDataset, item.fromColumn, item.toDataset, item.toColumn].join("|");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(item);
  }

  return result;
}

export class DataHubMetadataProvider implements MetadataProvider {
  private readonly graphqlUrl: string;
  private readonly token?: string;
  private readonly datasetEnv: string;
  private readonly fallbackProvider?: MetadataProvider;
  private readonly fetchImplementation: typeof fetch;

  constructor(options: DataHubMetadataProviderOptions) {
    this.graphqlUrl = options.graphqlUrl;
    this.token = options.token;
    this.datasetEnv = options.datasetEnv ?? "PROD";
    this.fallbackProvider = options.fallbackProvider;
    this.fetchImplementation = options.fetchImplementation ?? fetch;
  }

  private async graphql<TData>(query: string, variables: Record<string, unknown>): Promise<TData> {
    const response = await this.fetchImplementation(this.graphqlUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.token
          ? {
              Authorization: `Bearer ${this.token}`,
            }
          : {}),
      },
      body: JSON.stringify({
        query,
        variables,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`DataHub request failed (${response.status})`);
    }

    const payload = (await response.json()) as DataHubGraphQlResponse<TData>;

    if (payload.errors?.length) {
      throw new Error(
        payload.errors
          .map((error) => error.message)
          .filter(Boolean)
          .join("; ") || "DataHub GraphQL error",
      );
    }

    if (!payload.data) {
      throw new Error("DataHub GraphQL response did not include data.");
    }

    return payload.data;
  }

  private async withFallback<T>(label: string, factory: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
    try {
      return await factory();
    } catch (error) {
      console.warn(`DataHub metadata fallback for ${label}:`, error);
      return fallback();
    }
  }

  private async searchDataset(name: string) {
    const data = await this.graphql<DataHubSearchResponse>(
      `
      query SearchDatasets($query: String!) {
        search(input: { type: DATASET, query: $query, start: 0, count: 25 }) {
          searchResults {
            entity {
              urn
              type
              ... on Dataset {
                name
                properties {
                  name
                  description
                }
              }
            }
          }
        }
      }
      `,
      { query: name },
    );

    const results =
      data.search?.searchResults
        ?.map((item) => item.entity)
        .filter((entity): entity is NonNullable<typeof entity> => Boolean(entity?.urn)) ?? [];

    const exactMatch = results.find((entity) => {
      const candidates = [entity.name, entity.properties?.name, entity.urn]
        .filter(Boolean)
        .map((value) => normalizeName(String(value)));

      return candidates.some(
        (candidate) => candidate === normalizeName(name) || candidate.includes(`,${normalizeName(name)},`),
      );
    });

    return exactMatch ?? results[0] ?? null;
  }

  private async fetchDatasetDetails(urn: string) {
    const data = await this.graphql<DataHubDatasetResponse>(
      `
      query GetDataset($urn: String!) {
        dataset(urn: $urn) {
          urn
          name
          properties {
            name
            description
          }
          editableProperties {
            description
          }
          schemaMetadata {
            fields {
              fieldPath
              description
              nullable
              nativeDataType
            }
          }
        }
      }
      `,
      { urn },
    );

    return data.dataset ?? null;
  }

  private async fetchLineageRelationships(datasetName: string, urn: string): Promise<MetadataRelationshipInfo[]> {
    const fetchDirection = async (direction: "UPSTREAM" | "DOWNSTREAM") => {
      const data = await this.graphql<DataHubLineageResponse>(
        `
        query GetLineage($urn: String!, $direction: LineageDirection!) {
          lineage(input: { urn: $urn, direction: $direction, start: 0, count: 100 }) {
            relationships {
              entity {
                urn
                type
                ... on Dataset {
                  name
                  properties {
                    name
                  }
                }
              }
            }
          }
        }
        `,
        { urn, direction },
      );

      return (
        data.lineage?.relationships
          ?.map((item) => item.entity)
          .filter((entity): entity is NonNullable<typeof entity> => Boolean(entity?.urn))
          .map((entity) => {
            const relatedDataset = entity.properties?.name ?? entity.name ?? entity.urn ?? "unknown";

            return {
              name: `${normalizeName(direction)}_${normalizeName(datasetName)}_${normalizeName(relatedDataset)}`,
              fromDataset: direction === "UPSTREAM" ? relatedDataset : datasetName,
              fromColumn: "*",
              toDataset: direction === "UPSTREAM" ? datasetName : relatedDataset,
              toColumn: "*",
              description:
                direction === "UPSTREAM"
                  ? `DataHub lineage indicates ${relatedDataset} is upstream of ${datasetName}.`
                  : `DataHub lineage indicates ${datasetName} is upstream of ${relatedDataset}.`,
            } satisfies MetadataRelationshipInfo;
          }) ?? []
      );
    };

    try {
      const [upstream, downstream] = await Promise.all([fetchDirection("UPSTREAM"), fetchDirection("DOWNSTREAM")]);

      return uniqueRelationships([...upstream, ...downstream]);
    } catch {
      return [];
    }
  }

  private async buildDatasetInfo(name: string): Promise<MetadataDatasetInfo | null> {
    const searchResult = await this.searchDataset(name);

    if (!searchResult?.urn) {
      return null;
    }

    const details = await this.fetchDatasetDetails(searchResult.urn);
    const fallbackInfo = this.fallbackProvider ? await this.fallbackProvider.getDatasetInfo(name) : null;
    const datasetName = details?.properties?.name ?? details?.name ?? fallbackInfo?.name ?? name;
    const description =
      details?.editableProperties?.description ?? details?.properties?.description ?? fallbackInfo?.description ?? "";
    const columns =
      details?.schemaMetadata?.fields
        ?.map((field) => {
          const fieldName = field?.fieldPath?.trim();

          if (!fieldName) {
            return null;
          }

          return {
            name: fieldName,
            dataType: field?.nativeDataType?.trim() || "unknown",
            nullable: Boolean(field?.nullable),
            description: field?.description?.trim() || "",
          } satisfies MetadataColumnInfo;
        })
        .filter((field): field is MetadataColumnInfo => field !== null) ??
      fallbackInfo?.columns ??
      [];

    const lineageRelationships = await this.fetchLineageRelationships(datasetName, searchResult.urn);
    const fallbackRelationships = this.fallbackProvider
      ? await this.fallbackProvider.listRelationships(datasetName)
      : [];

    return {
      name: datasetName,
      kind: fallbackInfo?.kind ?? "table",
      description,
      columns: uniqueByName(columns),
      relationships: uniqueRelationships([...lineageRelationships, ...fallbackRelationships]),
    };
  }

  async listDatasets(): Promise<MetadataDatasetInfo[]> {
    return this.withFallback(
      "listDatasets",
      async () => {
        const data = await this.graphql<DataHubSearchResponse>(
          `
          query SearchAllDatasets {
            search(input: { type: DATASET, query: "*", start: 0, count: 100 }) {
              searchResults {
                entity {
                  urn
                  ... on Dataset {
                    name
                    properties {
                      name
                      description
                    }
                  }
                }
              }
            }
          }
          `,
          {},
        );

        const names =
          data.search?.searchResults
            ?.map((item) => item.entity?.properties?.name ?? item.entity?.name)
            .filter((name): name is string => Boolean(name?.trim())) ?? [];

        const datasets = await Promise.all(
          uniqueByName(names.map((name) => ({ name }))).map((entry) => this.buildDatasetInfo(entry.name)),
        );

        return datasets.filter((dataset): dataset is MetadataDatasetInfo => dataset !== null);
      },
      async () => (this.fallbackProvider ? this.fallbackProvider.listDatasets() : []),
    );
  }

  async getDatasetInfo(name: string): Promise<MetadataDatasetInfo | null> {
    return this.withFallback(
      `getDatasetInfo:${name}`,
      async () => this.buildDatasetInfo(name),
      async () => (this.fallbackProvider ? this.fallbackProvider.getDatasetInfo(name) : null),
    );
  }

  async listColumns(dataset: string): Promise<MetadataColumnInfo[]> {
    const info = await this.getDatasetInfo(dataset);

    return info?.columns ?? [];
  }

  async getColumnInfo(dataset: string, column: string): Promise<MetadataColumnInfo | null> {
    const columns = await this.listColumns(dataset);
    const normalizedColumn = normalizeName(column);

    return columns.find((item) => normalizeName(item.name) === normalizedColumn) ?? null;
  }

  async listRelationships(dataset?: string): Promise<MetadataRelationshipInfo[]> {
    if (!dataset) {
      return this.withFallback(
        "listRelationships:*",
        async () => {
          const datasets = await this.listDatasets();
          return uniqueRelationships(datasets.flatMap((item) => item.relationships));
        },
        async () => (this.fallbackProvider ? this.fallbackProvider.listRelationships() : []),
      );
    }

    const info = await this.getDatasetInfo(dataset);

    return info?.relationships ?? [];
  }
}
