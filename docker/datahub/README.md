# DataHub Integration

This directory contains a local DataHub deployment and a PostgreSQL ingestion recipe for StreetScore metadata.

StreetScore already supports switching between `local`, `shared`, and `branch` database targets via connection strings. The DataHub integration mirrors that behavior through a single `DATABASE_TARGET` value and a generated ingestion env file.

## Services

StreetScore expects a local DataHub deployment to be running and reachable via the GraphQL URL configured for the app (`DATAHUB_GRAPHQL_URL`).

If you use DataHub quickstart defaults, frontend and GraphQL may run on different ports than this repository's examples. Use the actual running endpoint and set `DATAHUB_GRAPHQL_URL` accordingly.

## Prepare Ingestion Variables

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_TARGET` to `local`, `shared`, or `branch`.
3. Ensure the corresponding StreetScore connection string env vars are available, or provide the optional explicit override values in `.env`.
4. Generate the generic ingestion variables:

   `npm run datahub:prepare-env`

## Start DataHub

Use your local DataHub quickstart or existing local DataHub stack. After startup:

1. Open the DataHub UI (port depends on your setup).
2. Confirm GraphQL is reachable from StreetScore via `DATAHUB_GRAPHQL_URL`.

## Ingest StreetScore PostgreSQL Metadata

DataHub's Postgres source supports discovery of:

- Tables
- Views
- Columns
- Descriptions
- View lineage
- Query lineage via `pg_stat_statements`

Run ingestion using the official DataHub CLI or ingestion container against `docker/datahub/postgres-ingestion.yml`.

Recommended workflow:

1. Regenerate the target-specific generic env file whenever `DATABASE_TARGET` changes:

   `npm run datahub:prepare-env`

2. Run ingestion with both env files available:

   `set -a; source docker/datahub/.env; source docker/datahub/.generated-ingestion.env; set +a`

   `datahub ingest -c docker/datahub/postgres-ingestion.yml`

If you use Docker for ingestion instead of the local CLI, pass both env files to the ingestion container.

## Target Resolution

`DATABASE_TARGET` controls which database DataHub ingests:

- `local` uses `DATABASE_URL` by default, or `LOCAL_POSTGRES_*` overrides if present.
- `shared` uses `NEON_SHARED_DATABASE_URL` by default, or `NEON_SHARED_*` overrides if present.
- `branch` uses `NEON_BRANCH_DATABASE_URL` by default, or `NEON_BRANCH_*` overrides if present.

The prepare script parses the selected connection details and writes a generated file with:

- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `POSTGRES_DATABASE`
- `POSTGRES_USERNAME`
- `POSTGRES_PASSWORD`
- `POSTGRES_SSLMODE`

This keeps `postgres-ingestion.yml` reusable and avoids maintaining separate YAML recipes per database target.

## PostgreSQL lineage prerequisites

To ingest query-based lineage from PostgreSQL, ensure:

- PostgreSQL 13+
- `pg_stat_statements` is enabled in `shared_preload_libraries`
- `CREATE EXTENSION IF NOT EXISTS pg_stat_statements;`
- `GRANT pg_read_all_stats TO <datahub_user>;`

Without those prerequisites, DataHub can still ingest tables, views, columns, and descriptions, but query-based lineage will be incomplete.

Neon targets automatically resolve to `POSTGRES_SSLMODE=require`. Local PostgreSQL resolves to `POSTGRES_SSLMODE=disable` unless overridden.