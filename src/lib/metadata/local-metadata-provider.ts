import type {
  MetadataColumnInfo,
  MetadataDatasetInfo,
  MetadataProvider,
  MetadataRelationshipInfo,
} from "@/lib/metadata/metadata-provider";

type MetadataRegistry = Record<string, MetadataDatasetInfo>;

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function createRelationships(dataset: string, relationships: MetadataRelationshipInfo[]): MetadataRelationshipInfo[] {
  return relationships.filter(
    (relationship) => relationship.fromDataset === dataset || relationship.toDataset === dataset,
  );
}

const relationships: MetadataRelationshipInfo[] = [
  {
    name: "neighborhoods_league_fk",
    fromDataset: "neighborhoods",
    fromColumn: "league_id",
    toDataset: "leagues",
    toColumn: "league_id",
    description: "Each neighborhood belongs to a league.",
  },
  {
    name: "operators_league_fk",
    fromDataset: "operators",
    fromColumn: "league_id",
    toDataset: "leagues",
    toColumn: "league_id",
    description: "Each operator belongs to a league.",
  },
  {
    name: "standings_entries_league_fk",
    fromDataset: "standings_entries",
    fromColumn: "league_id",
    toDataset: "leagues",
    toColumn: "league_id",
    description: "Each standings row belongs to a league.",
  },
  {
    name: "standings_entries_neighborhood_fk",
    fromDataset: "standings_entries",
    fromColumn: "neighborhood_id",
    toDataset: "neighborhoods",
    toColumn: "neighborhood_id",
    description: "Each standings row belongs to a neighborhood.",
  },
  {
    name: "standings_entries_operator_fk",
    fromDataset: "standings_entries",
    fromColumn: "operator_id",
    toDataset: "operators",
    toColumn: "operator_id",
    description: "Each standings row belongs to an operator.",
  },
  {
    name: "score_inputs_entry_fk",
    fromDataset: "score_inputs",
    fromColumn: "entry_id",
    toDataset: "standings_entries",
    toColumn: "entry_id",
    description: "Each score input row belongs to one standings entry.",
  },
  {
    name: "standings_history_league_fk",
    fromDataset: "standings_history",
    fromColumn: "league_id",
    toDataset: "leagues",
    toColumn: "league_id",
    description: "Each historical snapshot belongs to a league.",
  },
  {
    name: "standings_history_neighborhood_fk",
    fromDataset: "standings_history",
    fromColumn: "neighborhood_id",
    toDataset: "neighborhoods",
    toColumn: "neighborhood_id",
    description: "Each historical snapshot belongs to a neighborhood.",
  },
  {
    name: "standings_history_operator_fk",
    fromDataset: "standings_history",
    fromColumn: "operator_id",
    toDataset: "operators",
    toColumn: "operator_id",
    description: "Each historical snapshot belongs to an operator.",
  },
];

const datasets: MetadataRegistry = {
  leagues: {
    name: "leagues",
    kind: "table",
    description: "Reference data for league names, labels, and descriptions.",
    columns: [
      {
        name: "league_id",
        dataType: "varchar(32)",
        nullable: false,
        description: "Primary key for the league.",
      },
      {
        name: "league_name",
        dataType: "varchar(80)",
        nullable: false,
        description: "Display name for the league.",
      },
      {
        name: "volume_label",
        dataType: "varchar(40)",
        nullable: false,
        description: "UI label used to describe the operator volume or type grouping.",
      },
      {
        name: "description",
        dataType: "text",
        nullable: true,
        description: "Optional description of the league.",
      },
    ],
    relationships: createRelationships("leagues", relationships),
  },
  neighborhoods: {
    name: "neighborhoods",
    kind: "table",
    description: "Neighborhood reference records used to partition rankings by local market.",
    columns: [
      {
        name: "neighborhood_id",
        dataType: "varchar(64)",
        nullable: false,
        description: "Primary key for the neighborhood.",
      },
      {
        name: "league_id",
        dataType: "varchar(32)",
        nullable: false,
        description: "Foreign key to the owning league.",
      },
      {
        name: "zip_code",
        dataType: "varchar(10)",
        nullable: false,
        description: "ZIP code used to map businesses into a neighborhood.",
      },
      {
        name: "neighborhood_name",
        dataType: "varchar(80)",
        nullable: false,
        description: "Display name for the neighborhood used in ranking partitions and UI filters.",
      },
    ],
    relationships: createRelationships("neighborhoods", relationships),
  },
  operators: {
    name: "operators",
    kind: "table",
    description: "Core operator identity and status records used by rankings and profile views.",
    columns: [
      {
        name: "operator_id",
        dataType: "varchar(96)",
        nullable: false,
        description: "Primary key for the operator.",
      },
      {
        name: "operator_name",
        dataType: "varchar(120)",
        nullable: false,
        description: "Display name for the operator.",
      },
      {
        name: "league_id",
        dataType: "varchar(32)",
        nullable: false,
        description: "Foreign key to the operator's league.",
      },
      {
        name: "operator_type",
        dataType: "varchar(80)",
        nullable: true,
        description: "Optional operator subtype or business category.",
      },
      {
        name: "is_verified",
        dataType: "boolean",
        nullable: false,
        description: "Business verification flag shown in rankings and operator displays.",
      },
      {
        name: "is_current_user",
        dataType: "boolean",
        nullable: false,
        description: "Flag indicating whether the operator belongs to the current user context.",
      },
      {
        name: "status",
        dataType: "text",
        nullable: false,
        description: "Lifecycle status for the operator, such as active or inactive.",
      },
    ],
    relationships: createRelationships("operators", relationships),
  },
  standings_entries: {
    name: "standings_entries",
    kind: "table",
    description: "Current standings rows containing the live REP Score and rank for each operator slice.",
    columns: [
      {
        name: "entry_id",
        dataType: "varchar(128)",
        nullable: false,
        description: "Primary key for the current standings entry.",
      },
      {
        name: "season_id",
        dataType: "varchar(20)",
        nullable: false,
        description: "Season identifier associated with the standings row.",
      },
      {
        name: "time_window",
        dataType: "varchar(40)",
        nullable: false,
        description: "Time window label for the standings row, such as last 30 days.",
      },
      {
        name: "league_id",
        dataType: "varchar(32)",
        nullable: false,
        description: "Foreign key to the league.",
      },
      {
        name: "neighborhood_id",
        dataType: "varchar(64)",
        nullable: false,
        description: "Foreign key to the neighborhood used for rank partitioning.",
      },
      {
        name: "zip_code",
        dataType: "varchar(10)",
        nullable: false,
        description: "ZIP code associated with the ranking slice.",
      },
      {
        name: "operator_id",
        dataType: "varchar(96)",
        nullable: false,
        description: "Foreign key to the operator.",
      },
      {
        name: "rank",
        dataType: "integer",
        nullable: false,
        description: "Current calculated rank within the league and neighborhood partition.",
      },
      {
        name: "rep_score",
        dataType: "integer",
        nullable: false,
        description: "Current calculated REP Score bounded between 0 and 100.",
      },
      {
        name: "distance_miles",
        dataType: "numeric(7,2)",
        nullable: true,
        description: "Optional distance field stored on the standings row.",
      },
    ],
    relationships: createRelationships("standings_entries", relationships),
  },
  standings_history: {
    name: "standings_history",
    kind: "table",
    description: "Historical snapshots of rank and REP Score used for movement and timeline analytics.",
    columns: [
      {
        name: "snapshot_date",
        dataType: "date",
        nullable: false,
        description: "Snapshot day used for exact-date historical comparisons.",
      },
      {
        name: "league_id",
        dataType: "varchar(32)",
        nullable: false,
        description: "Foreign key to the league.",
      },
      {
        name: "neighborhood_id",
        dataType: "varchar(64)",
        nullable: false,
        description: "Foreign key to the neighborhood.",
      },
      {
        name: "operator_id",
        dataType: "varchar(96)",
        nullable: false,
        description: "Foreign key to the operator.",
      },
      {
        name: "rank",
        dataType: "integer",
        nullable: false,
        description: "Rank captured at snapshot time.",
      },
      {
        name: "rep_score",
        dataType: "integer",
        nullable: false,
        description: "REP Score captured at snapshot time.",
      },
      {
        name: "created_at",
        dataType: "timestamp",
        nullable: false,
        description: "Timestamp when the snapshot row was created.",
      },
    ],
    relationships: createRelationships("standings_history", relationships),
  },
  score_inputs: {
    name: "score_inputs",
    kind: "table",
    description: "Raw score inputs consumed by the SQL REP Score calculation.",
    columns: [
      {
        name: "entry_id",
        dataType: "varchar(128)",
        nullable: false,
        description: "Primary key and foreign key to the standings entry receiving these inputs.",
      },
      {
        name: "volume_count",
        dataType: "integer",
        nullable: false,
        description: "Currently stored count field available for future scoring or analytics.",
      },
      {
        name: "rating",
        dataType: "numeric(2,1)",
        nullable: false,
        description: "Average customer rating input used by the current REP Score formula.",
      },
      {
        name: "review_count",
        dataType: "numeric",
        nullable: true,
        description: "Review count input used by the current REP Score formula.",
      },
      {
        name: "license_verified",
        dataType: "boolean",
        nullable: false,
        description: "License verification input used by the current REP Score formula.",
      },
    ],
    relationships: createRelationships("score_inputs", relationships),
  },
  standings_page_rows: {
    name: "standings_page_rows",
    kind: "view",
    description: "Joined read model for standings pages, comparison views, and leaderboard APIs.",
    columns: [
      {
        name: "entry_id",
        dataType: "varchar(128)",
        nullable: false,
        description: "Current standings entry identifier.",
      },
      {
        name: "rank",
        dataType: "integer",
        nullable: false,
        description: "Current rank for the row.",
      },
      {
        name: "operator_id",
        dataType: "varchar(96)",
        nullable: false,
        description: "Operator identifier for the row.",
      },
      {
        name: "operator_name",
        dataType: "varchar(120)",
        nullable: false,
        description: "Operator display name used in rankings and comparisons.",
      },
      {
        name: "operator_type",
        dataType: "varchar(80)",
        nullable: true,
        description: "Optional operator subtype carried through from operators.",
      },
      {
        name: "is_verified",
        dataType: "boolean",
        nullable: false,
        description: "Operator verification flag exposed to the UI.",
      },
      {
        name: "is_current_user",
        dataType: "boolean",
        nullable: false,
        description: "Current-user ownership flag exposed to the UI.",
      },
      {
        name: "status",
        dataType: "text",
        nullable: false,
        description: "Operator status carried into the standings read model.",
      },
      {
        name: "league_id",
        dataType: "varchar(32)",
        nullable: false,
        description: "League identifier for the standings row.",
      },
      {
        name: "league_name",
        dataType: "varchar(80)",
        nullable: true,
        description: "League display name.",
      },
      {
        name: "volume_label",
        dataType: "varchar(40)",
        nullable: true,
        description: "League volume label exposed for display.",
      },
      {
        name: "neighborhood_id",
        dataType: "varchar(64)",
        nullable: true,
        description: "Neighborhood identifier for the row.",
      },
      {
        name: "neighborhood_name",
        dataType: "varchar(80)",
        nullable: true,
        description: "Neighborhood display name used in filters and headings.",
      },
      {
        name: "zip_code",
        dataType: "varchar(10)",
        nullable: false,
        description: "ZIP code for the standings row.",
      },
      {
        name: "time_window",
        dataType: "varchar(40)",
        nullable: false,
        description: "Time window represented by the row.",
      },
      {
        name: "rep_score",
        dataType: "integer",
        nullable: false,
        description: "Current REP Score returned to standings APIs.",
      },
      {
        name: "rating",
        dataType: "numeric(2,1)",
        nullable: true,
        description: "Raw rating input joined from score_inputs.",
      },
      {
        name: "review_count",
        dataType: "numeric",
        nullable: true,
        description: "Raw review count joined from score_inputs.",
      },
      {
        name: "volume_count",
        dataType: "integer",
        nullable: true,
        description: "Auxiliary count field joined from score_inputs.",
      },
      {
        name: "rank_delta_30d",
        dataType: "integer",
        nullable: true,
        description: "Derived 30-day rank movement based on historical snapshots.",
      },
      {
        name: "distance_miles",
        dataType: "numeric(7,2)",
        nullable: true,
        description: "Distance value surfaced in the standings read model.",
      },
    ],
    relationships: createRelationships("standings_page_rows", relationships),
  },
};

export class LocalMetadataProvider implements MetadataProvider {
  async listDatasets(): Promise<MetadataDatasetInfo[]> {
    return Object.values(datasets);
  }

  async getDatasetInfo(name: string): Promise<MetadataDatasetInfo | null> {
    return datasets[normalizeName(name)] ?? null;
  }

  async listColumns(dataset: string): Promise<MetadataColumnInfo[]> {
    return datasets[normalizeName(dataset)]?.columns ?? [];
  }

  async getColumnInfo(dataset: string, column: string): Promise<MetadataColumnInfo | null> {
    const datasetInfo = datasets[normalizeName(dataset)];

    if (!datasetInfo) {
      return null;
    }

    const normalizedColumn = normalizeName(column);

    return datasetInfo.columns.find((item) => normalizeName(item.name) === normalizedColumn) ?? null;
  }

  async listRelationships(dataset?: string): Promise<MetadataRelationshipInfo[]> {
    if (!dataset) {
      return relationships;
    }

    return createRelationships(normalizeName(dataset), relationships);
  }
}

export const localMetadataProvider = new LocalMetadataProvider();
