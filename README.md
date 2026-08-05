# StreetScore

**StreetScore** is a neighborhood reputation platform that ranks local service providers using a transparent **REP Score**.

Instead of relying on review volume or paid visibility alone, StreetScore combines multiple reputation signals into a single score that users can compare across neighborhoods. The platform also provides an **Explain REP Score** workflow that turns the underlying score data and metadata context into a plain-language explanation of why a provider ranks where it does and what could improve the score.

---

## Project Overview

StreetScore addresses a practical trust problem in local services: a large number of reviews or prominent placement does not necessarily mean a provider is reliable.

The REP Score combines multiple signals to create a more transparent comparison.

Current REP Score inputs include:

* Rating strength
* Review strength
* License verification
* Data completeness
* Rank movement history

The application allows users to:

* Browse service-provider rankings
* Compare providers
* Inspect REP Score factors
* View ranking movement
* Request a plain-language explanation of a REP Score

The explanation workflow is designed to connect the application's live scoring data with metadata about the underlying datasets.

---

# Challenge Category

**Open / Wildcard**

StreetScore is a real application that uses DataHub metadata to improve score explainability and metadata-aware application behavior.

It does not currently focus on production data-code generation or production ML guardrail workflows, so Open / Wildcard is the intended category.

---

# Technology Stack

* **Next.js**
* **React**
* **TypeScript**
* **PostgreSQL**
* **DataHub**
* **GraphQL**
* **MCP metadata-provider path**
* **Docker**
* **DataHub CLI**
* **Local deterministic explanation fallback**
* Optional **OpenAI text provider**

---

# Architecture

```text
                         ┌──────────────────────┐
                         │      StreetScore      │
                         │      Next.js UI       │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │  Explain REP Score   │
                         │      API Route       │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ REP Score Explanation│
                         │       Service        │
                         └──────────┬───────────┘
                                    │
                     ┌──────────────┴──────────────┐
                     │                             │
                     ▼                             ▼
          ┌────────────────────┐        ┌────────────────────┐
          │  Metadata Provider │        │   REP Score Data   │
          └─────────┬──────────┘        │   PostgreSQL DB    │
                    │                   └────────────────────┘
          ┌─────────┼──────────┐
          │         │          │
          ▼         ▼          ▼
        MCP     DataHub     Local Metadata
       Server   GraphQL       Fallback
          │         │
          └────┬────┘
               │
               ▼
       DataHub Metadata
               │
               ▼
       Score + Metadata Context
               │
               ▼
      Explanation Text Provider
          │              │
          ▼              ▼
       OpenAI       Deterministic
       optional        fallback
          │              │
          └──────┬───────┘
                 ▼
          Explanation JSON
                 │
                 ▼
          StreetScore Dialog
```

---

# DataHub Integration

StreetScore uses the open-source **DataHub** platform to ingest and expose metadata about the PostgreSQL datasets used by the application.

DataHub is not included merely as a separate dashboard. The Explain workflow has a metadata-provider abstraction that can retrieve dataset and column context and use that context when constructing score explanations.

## Metadata Ingested

The local PostgreSQL ingestion currently discovers:

### Tables

* `standings_entries`
* `standings_history`
* `score_inputs`
* `operators`
* `neighborhoods`
* `leagues`

### View

* `standings_page_rows`

DataHub ingestion includes:

* Dataset metadata
* Schema metadata
* Column metadata
* Dataset status
* Browse paths
* PostgreSQL view metadata
* View lineage where supported

---

## Verified DataHub Ingestion

The local ingestion pipeline has been successfully executed against the StreetScore PostgreSQL database.

A successful run produced:

```text
tables_scanned: 6
views_scanned: 1
events_produced: 45
total_records_written: 47
failures: []
```

The DataHub PostgreSQL ingestion completed successfully.

---

## Verified GraphQL Metadata Access

DataHub GraphQL successfully returns StreetScore datasets.

For example, searching for `standings_entries` returned dataset metadata including:

```text
urn:li:dataset:(urn:li:dataPlatform:postgres,
chama_standings_test.public.standings_entries,DEV)
```

The DataHub instance also exposes metadata for:

```text
standings_entries
standings_page_rows
standings_history
score_inputs
leagues
neighborhoods
operators
```

---

# DataHub Developer Tool Integration

The project includes an MCP Server metadata-provider path.

The metadata provider supports:

```text
DATAHUB_METADATA_PROVIDER=mcp
```

When configured for MCP, the Explain workflow can use the MCP metadata client path to retrieve dataset metadata.

The project also retains the DataHub GraphQL provider and local metadata fallback so the application can continue functioning when an external metadata service is unavailable.

The relevant implementation is located in:

```text
src/lib/metadata/configured-metadata-provider.ts
src/lib/metadata/datahub-metadata-provider.ts
src/lib/metadata/local-metadata-provider.ts
```

The explanation workflow is located in:

```text
src/app/api/rep-score/explain/route.ts
src/server/rep-score-explanation.ts
src/server/rep-score-ai-explanation.ts
```

---

# Metadata Provider Behavior

StreetScore supports multiple metadata-provider paths.

## DataHub GraphQL

The default metadata path uses DataHub GraphQL.

```text
StreetScore
    ↓
Metadata Provider
    ↓
DataHub GraphQL
    ↓
Dataset / schema metadata
```

## MCP

The MCP path can be selected with:

```env
DATAHUB_METADATA_PROVIDER=mcp
```

The MCP provider can be configured with:

```env
DATAHUB_MCP_SERVER_COMMAND=node
DATAHUB_MCP_SERVER_ARGS='scripts/mock-datahub-mcp-server.mjs'
DATAHUB_MCP_DATASET_TOOL=get_dataset_metadata
```

The exact MCP server executable and arguments can be changed to match the available MCP server implementation.

## Local Fallback

If external metadata cannot be reached, StreetScore falls back to local metadata.

This is intentional graceful degradation.

The fallback does **not** mean that DataHub is unused. It ensures that the application's core explanation feature remains available when DataHub is temporarily unavailable.

---

# Explanation Provider Behavior

The text-generation layer also supports multiple paths.

### Optional OpenAI provider

If:

```env
OPENAI_API_KEY=...
```

is configured, the application can use the configured OpenAI text provider.

### Local deterministic fallback

When no OpenAI API key is configured, StreetScore uses deterministic local explanation output.

This allows the project to run without requiring paid API access.

The application should not be considered dependent on an OpenAI API key for local development or judging.

---

# Project Structure

Important files include:

```text
src/
├── app/
│   └── api/
│       └── rep-score/
│           └── explain/
│               └── route.ts
│
├── server/
│   ├── rep-score-explanation.ts
│   └── rep-score-ai-explanation.ts
│
└── lib/
    └── metadata/
        ├── configured-metadata-provider.ts
        ├── datahub-metadata-provider.ts
        └── local-metadata-provider.ts

docker/
└── datahub/
    ├── .env
    ├── .generated-ingestion.env
    └── postgres-ingestion.yml

examples/
├── rep-score-explain-response.local-fallback.json
└── rep-score-explain-response.summary.json
```

---

# Local Development Setup

## Prerequisites

You will need:

* Node.js
* npm
* PostgreSQL
* Docker Desktop
* Python with the DataHub CLI installed

OpenAI is **optional**.

You do not need an OpenAI API key to run the local explanation fallback.

---

# 1. Clone the Repository

Clone the repository and enter the project directory:

```bash
git clone <https://github.com/omargarcia10-k/streetscore_project-.git>
cd streetscore_project-
```

---

# 2. Install Node Dependencies

```bash
npm install
```

---

# 3. Install PostgreSQL

StreetScore uses PostgreSQL for its local application database.

## macOS + Homebrew

If Homebrew is installed:

```bash
brew install postgresql@16
```

Start PostgreSQL:

```bash
brew services start postgresql@16
```

Verify that it is running:

```bash
brew services list
```

Verify the PostgreSQL client:

```bash
psql --version
```

If PostgreSQL is already installed, do not reinstall it. Start the existing PostgreSQL service instead.

---

# 4. Create the StreetScore PostgreSQL Database

StreetScore's local database is:

```text
chama_standings_test
```

The local development setup uses the PostgreSQL role:

```text
chris
```

Check existing PostgreSQL roles:

```bash
psql -d postgres -c "\du"
```

If the `user` role does not exist, create it:

```bash
createuser -s user
```

Create the StreetScore database:

```bash
createdb -U user chama_standings_test
```

If PostgreSQL reports that the database already exists, that is okay.

Verify the database:

```bash
psql -U user -d chama_standings_test \
-c "SELECT current_database(), current_user;"
```

You should see:

```text
chama_standings_test
user
```

---

# 5. Configure StreetScore Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

For local PostgreSQL:

```env
DATABASE_URL=postgresql://chris@localhost:5432/chama_standings_test
USE_DATABASE=local
```

If your PostgreSQL installation requires a password:

```env
DATABASE_URL=postgresql://user:YOUR_PASSWORD@localhost:5432/chama_standings_test
USE_DATABASE=local
```

Never commit the real password.

---

# 6. Initialize the Database

Run:

```bash
npm run db:setup
```

This runs the repository's existing database initialization, seed, import, ranking, history, and view setup workflow.

Then verify:

```bash
npm run db:verify-history
npm run db:test-rank-delta
```

---

# 7. Verify PostgreSQL

Before starting DataHub, verify that PostgreSQL contains StreetScore tables:

```bash
psql -U user \
-h localhost \
-p 5432 \
-d chama_standings_test \
-c "\dt"
```

You should see the StreetScore database tables.

---

# 8. Install the DataHub CLI

The DataHub ingestion command is run from the host machine.

If `pip` is unavailable on macOS, use:

```bash
python3 -m pip install --user acryl-datahub
```

Then verify:

```bash
datahub version
```

If the `datahub` command is not found after installation, make sure the Python user-bin directory is available on your shell `PATH`.

---

# 9. Start DataHub

StreetScore includes DataHub configuration under:

```text
docker/datahub/
```

Use the repository's existing local DataHub deployment configuration.

Make sure the DataHub services are running before ingestion.

The local DataHub GMS endpoint used by the ingestion CLI is:

```text
http://localhost:8080
```

The DataHub frontend is exposed separately.

---

# 10. Configure DataHub PostgreSQL Ingestion

The PostgreSQL ingestion recipe is:

```text
docker/datahub/postgres-ingestion.yml
```

For ingestion executed directly from the Mac terminal, PostgreSQL should use:

```yaml
source:
  type: postgres
  config:
    host_port: localhost:5432
    database: chama_standings_test
    username: user
    password: ""

    env: DEV

    include_tables: true
    include_views: true

    include_view_lineage: true
    include_view_column_lineage: true

    schema_pattern:
      allow:
        - public

sink:
  type: datahub-rest
  config:
    server: http://localhost:8080
```

### Important

When running:

```bash
datahub ingest -c docker/datahub/postgres-ingestion.yml
```

from the Mac host, use:

```text
localhost:5432
```

Do not use:

```text
host.docker.internal:5432
```

for the host-side DataHub CLI.

`host.docker.internal` is intended for processes running inside Docker containers that need to access the host.

---

# 11. Run DataHub Metadata Ingestion

Prepare the DataHub environment if required by the repository:

```bash
npm run datahub:prepare-env
```

Then run:

```bash
set -a
source docker/datahub/.env
source docker/datahub/.generated-ingestion.env
set +a

datahub ingest -c docker/datahub/postgres-ingestion.yml
```

A successful run should report:

```text
failures: []
tables_scanned: ...
views_scanned: ...
events_produced: ...
```

The exact event count can change as the database schema changes.

---

# 12. Verify DataHub GraphQL

After ingestion, verify that DataHub can find StreetScore metadata.

Run:

```bash
curl -X POST http://localhost:8080/api/graphql \
-H "Content-Type: application/json" \
-d '{"query":"{ search(input:{type:DATASET, query:\"standings_entries\"}) { searchResults { entity { urn } } } }"}'
```

A successful response should contain StreetScore dataset URNs.

For example:

```text
urn:li:dataset:(urn:li:dataPlatform:postgres,
chama_standings_test.public.standings_entries,DEV)
```

You should also be able to find:

```text
operators
score_inputs
standings_history
standings_page_rows
neighborhoods
leagues
```

---

# 13. Configure DataHub for StreetScore

StreetScore can use DataHub metadata through the configured metadata provider.

Example:

```env
DATAHUB_GRAPHQL_URL=http://localhost:8080/api/graphql
DATAHUB_TOKEN=
DATAHUB_ENV=DEV
```

The application-side DataHub endpoint should be the endpoint that is reachable by the running StreetScore process.

Do not copy a UI-only DataHub URL into the application without verifying that the endpoint accepts the required API requests.

---

# 14. Run the MCP Verification Harness

Verify the MCP metadata-provider path:

```bash
npm run verify:datahub-mcp
```

This starts the repository's local stdio MCP verification server and verifies the MCP metadata-provider client path.

To run the Explain workflow through the MCP provider:

```bash
export DATAHUB_METADATA_PROVIDER=mcp
export DATAHUB_MCP_SERVER_COMMAND=node
export DATAHUB_MCP_SERVER_ARGS='scripts/mock-datahub-mcp-server.mjs'
export DATAHUB_MCP_DATASET_TOOL=get_dataset_metadata
```

Then start StreetScore:

```bash
npm run dev
```

---

# 15. Start StreetScore

Run:

```bash
npm run dev
```

Open:

```text
http://localhost:3000/dashboard/standings
```

---

# 16. Test the REP Score Explain Flow

From the standings page:

1. Select a neighborhood.
2. View the service-provider rankings.
3. Select a provider.
4. Open the REP Score explanation.
5. Confirm that the explanation displays.
6. Verify that the metadata-provider path is functioning.
7. Verify fallback behavior if DataHub or an optional text provider is unavailable.

---

# Environment Variables

## Required

```env
DATABASE_URL=
USE_DATABASE=
```

## DataHub

```env
DATAHUB_GRAPHQL_URL=http://localhost:8080/api/graphql
DATAHUB_TOKEN=
DATAHUB_ENV=DEV
```

## MCP Metadata Provider

```env
DATAHUB_METADATA_PROVIDER=mcp
DATAHUB_MCP_SERVER_COMMAND=
DATAHUB_MCP_SERVER_ARGS=
DATAHUB_MCP_SERVER_CWD=
DATAHUB_MCP_DATASET_TOOL=
```

## Optional OpenAI Provider

```env
OPENAI_API_KEY=
OPENAI_MODEL=
OPENAI_BASE_URL=
```

An OpenAI API key is not required for the local deterministic explanation fallback.

---

# Testing and Verification

Run the project's checks:

```bash
npm run check
npm run lint
npm run build
```

Database verification:

```bash
npm run db:verify-history
npm run db:test-rank-delta
```

DataHub MCP verification:

```bash
npm run verify:datahub-mcp
```

DataHub ingestion:

```bash
datahub ingest -c docker/datahub/postgres-ingestion.yml
```

GraphQL verification:

```bash
curl -X POST http://localhost:8080/api/graphql \
-H "Content-Type: application/json" \
-d '{"query":"{ search(input:{type:DATASET, query:\"standings_entries\"}) { searchResults { entity { urn } } } }"}'
```

---

# Troubleshooting

## PostgreSQL: `psql: command not found`

Install PostgreSQL:

```bash
brew install postgresql@16
```

Then verify:

```bash
psql --version
```

---

## PostgreSQL: `connection refused`

Check PostgreSQL:

```bash
brew services list
```

Start it:

```bash
brew services start postgresql@16
```

---

## PostgreSQL: database does not exist

Create it:

```bash
createdb -U user chama_standings_test
```

---

## PostgreSQL: role does not exist

Create the local role:

```bash
createuser -s user
```

Then:

```bash
createdb -U user chama_standings_test
```

---

## DataHub ingestion cannot resolve `host.docker.internal`

If running the DataHub CLI directly from the Mac terminal, use:

```yaml
host_port: localhost:5432
```

instead of:

```yaml
host_port: host.docker.internal:5432
```

---

## DataHub datasets are missing

Run:

```bash
datahub ingest -c docker/datahub/postgres-ingestion.yml
```

Then verify GraphQL:

```bash
curl -X POST http://localhost:8080/api/graphql \
-H "Content-Type: application/json" \
-d '{"query":"{ search(input:{type:DATASET, query:\"standings_entries\"}) { searchResults { entity { urn } } } }"}'
```

If ingestion reports failures, resolve those before testing the application metadata workflow.

---

## Explain works but DataHub is unavailable

StreetScore supports graceful metadata fallback.

The application can use local metadata when the external metadata provider cannot be reached.

This allows the explanation feature to remain usable during local development.

---

## OpenAI API key is missing

This is expected if running without an OpenAI API key.

StreetScore uses deterministic local explanation output when:

```env
OPENAI_API_KEY=
```

is not configured.

No paid OpenAI API access is required for the local fallback.

---

## MCP verification fails

Run:

```bash
npm run verify:datahub-mcp
```

Then verify the MCP configuration:

```bash
echo $DATAHUB_METADATA_PROVIDER
echo $DATAHUB_MCP_SERVER_COMMAND
echo $DATAHUB_MCP_SERVER_ARGS
echo $DATAHUB_MCP_DATASET_TOOL
```

For the repository's local verification server:

```bash
export DATAHUB_METADATA_PROVIDER=mcp
export DATAHUB_MCP_SERVER_COMMAND=node
export DATAHUB_MCP_SERVER_ARGS='scripts/mock-datahub-mcp-server.mjs'
export DATAHUB_MCP_DATASET_TOOL=get_dataset_metadata
```

---

# Sample Outputs

Runtime examples are available in:

```text
examples/
```

Current examples include:

```text
examples/rep-score-explain-response.local-fallback.json
examples/rep-score-explain-response.summary.json
```

These demonstrate representative REP Score explanation responses.

---

# Security

Never commit:

* `.env`
* `.env.local`
* database passwords
* API keys
* DataHub authentication tokens
* private credentials

Use placeholders in:

```text
.env.example
```

If credentials are accidentally exposed, rotate them before publishing the repository.

---

# License

StreetScore is licensed under the **Apache License 2.0**.

See:

```text
LICENSE
```

---

# Submission / Judge Quick Start

For a judge who wants to verify the project quickly:

### 1. Install dependencies

```bash
npm install
```

### 2. Start PostgreSQL

```bash
brew services start postgresql@16
```

### 3. Create the database if necessary

```bash
createuser -s user
createdb -U user chama_standings_test
```

### 4. Configure `.env`

```env
DATABASE_URL=postgresql://chris@localhost:5432/chama_standings_test
USE_DATABASE=local
```

### 5. Initialize StreetScore

```bash
npm run db:setup
```

### 6. Start DataHub

Start the local DataHub deployment configured under:

```text
docker/datahub/
```

### 7. Ingest metadata

```bash
datahub ingest -c docker/datahub/postgres-ingestion.yml
```

### 8. Verify DataHub

```bash
curl -X POST http://localhost:8080/api/graphql \
-H "Content-Type: application/json" \
-d '{"query":"{ search(input:{type:DATASET, query:\"standings_entries\"}) { searchResults { entity { urn } } } }"}'
```

### 9. Start StreetScore

```bash
npm run dev
```

### 10. Open

```text
http://localhost:3000/dashboard/standings
```

### 11. Test

Use the **Explain REP Score** workflow.

---

# Compliance Summary

StreetScore provides:

* A functioning neighborhood reputation application
* Transparent REP Score calculations
* Score-driver explainability
* PostgreSQL-backed application data
* DataHub metadata ingestion
* DataHub GraphQL metadata access
* DataHub schema and dataset metadata
* PostgreSQL view lineage where supported
* An MCP metadata-provider path
* A local metadata fallback
* A deterministic explanation fallback without paid AI access
* Local reproducible development setup
* Apache License 2.0

The application is designed so that DataHub metadata can contribute context to the REP Score explanation workflow while fallback providers maintain functionality when external services are unavailable.
