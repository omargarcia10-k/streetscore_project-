export type MetadataDatasetKind = "table" | "view";

export type MetadataColumnInfo = {
  name: string;
  dataType: string;
  nullable: boolean;
  description: string;
};

export type MetadataRelationshipInfo = {
  name: string;
  fromDataset: string;
  fromColumn: string;
  toDataset: string;
  toColumn: string;
  description: string;
};

export type MetadataDatasetInfo = {
  name: string;
  kind: MetadataDatasetKind;
  description: string;
  columns: MetadataColumnInfo[];
  relationships: MetadataRelationshipInfo[];
};

export interface MetadataProvider {
  listDatasets(): Promise<MetadataDatasetInfo[]>;
  getDatasetInfo(name: string): Promise<MetadataDatasetInfo | null>;
  listColumns(dataset: string): Promise<MetadataColumnInfo[]>;
  getColumnInfo(dataset: string, column: string): Promise<MetadataColumnInfo | null>;
  listRelationships(dataset?: string): Promise<MetadataRelationshipInfo[]>;
}
