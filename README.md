# StreetScore

**StreetScore** is a neighborhood reputation platform that ranks local service providers using a transparent **REP Score**.

Instead of relying on review volume or paid visibility alone, StreetScore combines multiple reputation signals into a single score that users can compare across neighborhoods. The platform also provides an **Explain REP Score** workflow that turns the underlying score data and metadata context into a plain-language explanation of why a provider ranks where it does and what could improve the score.

StreetScore also includes an **Ask StreetScore** workflow that connects natural-language questions to the StreetScore PostgreSQL database through the official **DataHub Analytics Agent**.

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
* Ask natural-language questions about StreetScore data

The explanation workflow is designed to connect the application's live scoring data with metadata about the underlying datasets.

The **Ask StreetScore** workflow integrates with the official **DataHub Analytics Agent**. It allows a user to ask questions in natural language and receive answers grounded in DataHub metadata and executed against the StreetScore PostgreSQL database.

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
* **DataHub Analytics Agent**
* **GraphQL**
* **MCP metadata-provider path**
* **Docker**
* **DataHub CLI**
* **Local deterministic explanation fallback**
* Optional **OpenAI text provider**
* Optional **Google Gemini provider through Analytics Agent**

---

# Architecture

```text
                         ┌──────────────────────┐
                         │      StreetScore      │
                         │      Next.js UI       │
                         └──────────┬───────────┘
                                    │
                    ┌───────────────┴────────────────┐
                    │                                │
                    ▼                                ▼
          ┌────────────────────┐          ┌────────────────────┐
          │ Explain REP Score  │          │  Ask StreetScore   │
          │      API Route     │          │      API Route      │
          └─────────┬──────────┘          └──────────┬─────────┘
                    │                                │
                    ▼                                ▼
          ┌────────────────────┐          ┌────────────────────┐
          │ REP Score          │          │ DataHub Analytics  │
          │ Explanation Service│          │ Agent              │
          └─────────┬──────────┘          └──────────┬─────────┘
                    │                                │
         ┌──────────┴──────────┐          ┌─────────┴──────────┐
         │                     │          │                    │
         ▼                     ▼          ▼                    ▼
┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐
│ Metadata Provider│  │ REP Score Data   │  │    DataHub    │
│                  │  │ PostgreSQL DB    │  │   Metadata    │
└────────┬─────────┘  └──────────────────┘  └───────┬───────┘
         │                                           │
    ┌────┼─────────────┐                             │
    │    │             │                             │
    ▼    ▼             ▼                             │
  MCP DataHub     Local Metadata                      │
  GraphQL         Fallback                            │
    │    │             │                             │
    └────┴──────┬──────┘                             │
                │                                    │
                ▼                                    │
        Score + Metadata Context                     │
                │                                    │
                ▼                                    │
       Explanation Text Provider                     │
         │                  │                        │
         ▼                  ▼                        │
      OpenAI          Deterministic                  │
      optional           fallback                    │
         │                  │                        │
         └──────────┬───────┘                        │
                    ▼                                │
             Explanation JSON                        │
                    │                                │
                    ▼                                │
             StreetScore UI                          │
                                                     │
                                                     ▼
                                            PostgreSQL Engine
                                                     │
                                                     ▼
                                             SQL + Answer
                                                     │
                                                     ▼
                                             StreetScore UI
```

---

## Analytics Agent Architecture

```text
              StreetScore
                  │
                  ▼
          ┌──────────────────┐
          │  Ask StreetScore │
          └────────┬─────────┘
                   │
                   ▼
          ┌──────────────────┐
          │ Analytics Agent  │
          │  localhost:8100  │
          └───────┬─────┬────┘
                  │     │
          ┌───────┘     └─────────────┐
          ▼                           ▼
┌────────────────────┐      ┌────────────────────┐
│      DataHub       │      │    PostgreSQL      │
│ Metadata / Context │      │ Actual REP Data    │
└─────────┬──────────┘      └─────────┬──────────┘
          │                           │
          └─────────────┬─────────────┘
                        ▼
                Generated SQL Answer
                        │
                        ▼
                  StreetScore UI
```

### Component Roles

#### PostgreSQL

Stores StreetScore source-of-truth business, scoring, standings, and historical data.

#### DataHub

Stores metadata and documentation context about the data, including datasets, schemas, columns, and lineage where supported.

#### Analytics Agent

The official open-source DataHub Analytics Agent service:

* receives the natural-language question,
* uses DataHub context tools to identify relevant data assets,
* generates SQL,
* executes SQL on the configured PostgreSQL engine,
* returns answer text and query results.

#### StreetScore

Provides the UI and server-side API bridge between the application and Analytics Agent.

Secrets remain server-side.

---

# DataHub Integration

StreetScore uses the open-source **DataHub** platform to ingest and expose metadata about the PostgreSQL datasets used by the application.

DataHub is not included merely as a separate dashboard. The Explain workflow has a metadata-provider abstraction that can retrieve dataset and column context and use that context when constructing score explanations.

The Ask StreetScore workflow also uses DataHub context through the official Analytics Agent.

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

The Analytics Agent workflow is located in:

```text
src/app/api/analytics/route.ts
src/lib/analytics-agent/client.ts
src/components/ask-streetscore-card.tsx
```

---

# Analytics Agent Integration

StreetScore integrates with the official **DataHub Analytics Agent** rather than reimplementing its natural-language-to-SQL functionality.

The Analytics Agent runs locally as a separate service and is accessed by StreetScore through a server-side API connection.

By default:

```text
StreetScore
    ↓
http://localhost:8100
    ↓
DataHub Analytics Agent
    ↓
DataHub metadata
    ↓
PostgreSQL engine
    ↓
SQL result
    ↓
StreetScore
```

The local Analytics Agent service can be verified with:

```bash
analytics-agent status
```

A running service should report:

```text
✓ Running → http://localhost:8100
```

---

## Analytics Agent Setup

The Analytics Agent is intentionally kept separate from the main Next.js application.

This allows the project to use the official DataHub Analytics Agent service while keeping the StreetScore application responsible for the user interface and API bridge.

### Create the Analytics Agent environment

Create a dedicated Python virtual environment:

```bash
python3 -m venv .analytics-agent-venv
```

Activate it:

```bash
source .analytics-agent-venv/bin/activate
```

Install the Analytics Agent:

```bash
pip install datahub-analytics-agent
```

Verify the command:

```bash
analytics-agent --help
```

---

## Configure Analytics Agent

The Analytics Agent configuration is stored locally under:

```text
~/.datahub/analytics-agent/
```

The service uses configuration for:

* DataHub GMS
* DataHub authentication
* PostgreSQL
* LLM provider
* LLM model
* API credentials

The local service runs at:

```text
http://localhost:8100
```

StreetScore connects to it using:

```env
ANALYTICS_AGENT_URL=http://localhost:8100
```

---

# Analytics Agent Environment Variables

The Analytics Agent can use a local `.env` file.

Example:

```env
DATAHUB_GMS_URL=http://localhost:8080
DATAHUB_GMS_TOKEN=

LLM_PROVIDER=google
GOOGLE_API_KEY=
```

The API key should never be committed to GitHub.

The Analytics Agent configuration supports different providers depending on the installed version and provider configuration.

For example:

```text
openai
google
anthropic
openai-compatible
```

The exact available models depend on the provider and current API availability.

---

# Google Gemini

StreetScore can use Google Gemini through the Analytics Agent.

Example:

```env
LLM_PROVIDER=google
GOOGLE_API_KEY=YOUR_GEMINI_API_KEY
```

The model should be configured to a model currently supported by the Google Gemini API and the installed Analytics Agent version.

For example:

```env
LLM_MODEL=gemini-2.0-flash
```

Model availability can change over time.

If Google returns a quota or rate-limit error, the Analytics Agent itself may still be working correctly. The error is coming from the selected LLM provider.

A typical quota error looks like:

```text
429 Too Many Requests
RESOURCE_EXHAUSTED
```

This is different from a DataHub connection failure.

---

# LLM Provider Notes

StreetScore does not require OpenAI specifically.

The official Analytics Agent supports multiple providers depending on the installed version and configuration.

Possible providers include:

* Google Gemini
* OpenAI
* Anthropic
* AWS Bedrock
* OpenAI-compatible endpoints

For local development, a provider can be selected through:

```env
LLM_PROVIDER=
```

An API key may be required by the selected provider.

The LLM is used by Analytics Agent to interpret natural-language questions and generate SQL/answers.

It is separate from the StreetScore deterministic REP Score explanation fallback.

---

# Analytics Agent PostgreSQL Engine

The Analytics Agent needs access to the StreetScore PostgreSQL database.

The configured engine points to:

```text
host: localhost
port: 5432
database: chama_standings_test
```

Example configuration:

```yaml
engines:
  - type: postgresql
    name: streetscore_postgres
    label: "StreetScore PostgreSQL"
    connection:
      dialect: postgresql+psycopg2
      host: localhost
      port: 5432
      user: user
      password: ""
      database: chama_standings_test
```

The database connection must be valid before asking Analytics Agent questions.

Verify PostgreSQL independently:

```bash
psql -U user \
-h localhost \
-p 5432 \
-d chama_standings_test \
-c "SELECT current_database(), current_user;"
```

---

# Verify Analytics Agent

Activate the environment:

```bash
source .analytics-agent-venv/bin/activate
```

Check the service:

```bash
analytics-agent status
```

Check the configured provider:

```bash
python -c "from analytics_agent.config import Settings; s=Settings(); print('Provider:', s.llm_provider); print('Key configured:', bool(s.get_api_key())); print('Model:', s.get_llm_model())"
```

A successful configuration should show something similar to:

```text
Provider: google
Key configured: True
Model: gemini-2.0-flash
```

Then check the service logs:

```bash
analytics-agent logs
```

Successful logs should show DataHub tools being loaded:

```text
Loaded 22 DataHub tools
NativeDataHub 'default': 22/22 tools active
```

This verifies that Analytics Agent is connected to DataHub and has access to its context tools.

---

# Start Analytics Agent

Activate the virtual environment:

```bash
source .analytics-agent-venv/bin/activate
```

Start the service:

```bash
analytics-agent start
```

Verify:

```bash
analytics-agent status
```

Expected:

```text
✓ Running
→ http://localhost:8100
```

Stop it with:

```bash
analytics-agent stop
```

View logs with:

```bash
analytics-agent logs
```

---

# Ask StreetScore

Once Analytics Agent is running, StreetScore can send natural-language questions to:

```text
http://localhost:8100
```

The application-side configuration is:

```env
ANALYTICS_AGENT_URL=http://localhost:8100
```

The user can then ask questions such as:

```text
Which provider has the highest REP Score?
```

```text
Which neighborhood has the most highly ranked providers?
```

```text
Which providers improved their rank?
```

```text
What factors contribute to the REP Score?
```

The Analytics Agent uses DataHub metadata to understand the available data and then uses the configured PostgreSQL engine to execute the generated SQL.

---

# Important: DataHub vs Analytics Agent vs LLM

These services have separate responsibilities.

### PostgreSQL

Contains the actual StreetScore data.

```text
providers
scores
standings
history
neighborhoods
```

### DataHub

Contains metadata about that data.

```text
datasets
schemas
columns
descriptions
lineage
```

### Analytics Agent

Uses DataHub context and the SQL engine to answer natural-language questions.

```text
Question
   ↓
DataHub context
   ↓
SQL generation
   ↓
PostgreSQL
   ↓
Answer
```

### Gemini / OpenAI / Other LLM

Provides the language-model reasoning used by Analytics Agent.

The LLM does not replace PostgreSQL or DataHub.

---

# StreetScore -> Analytics Agent Bridge

StreetScore communicates with Analytics Agent through:

```text
src/app/api/analytics/route.ts
src/lib/analytics-agent/client.ts
src/components/ask-streetscore-card.tsx
```

The browser communicates with StreetScore.

StreetScore communicates with Analytics Agent server-side.

This keeps Analytics Agent configuration and credentials away from the browser.

```text
Browser
   ↓
StreetScore /api/analytics
   ↓
Analytics Agent
   ↓
DataHub + PostgreSQL
```

---

# Graceful Failure

StreetScore is designed so that an external AI provider failure does not break the rest of the application.

For example, if Gemini returns:

```text
429 Too Many Requests
```

the Analytics Agent may be temporarily unable to answer a question.

The core StreetScore application can continue operating.

Likewise, if the DataHub metadata provider is temporarily unavailable, the REP Score explanation workflow can use its configured local metadata fallback.

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

# Environment Variables

## StreetScore app

```env
DATABASE_URL=
USE_DATABASE=local

DATAHUB_GRAPHQL_URL=http://localhost:8080/api/graphql
DATAHUB_TOKEN=
DATAHUB_ENV=DEV
```

## StreetScore -> Analytics Agent bridge

```env
ANALYTICS_AGENT_URL=http://localhost:8100
ANALYTICS_AGENT_ENGINE=
ANALYTICS_DEBUG=false
```

## Analytics Agent service

```env
DATAHUB_GMS_URL=
DATAHUB_GMS_TOKEN=

LLM_PROVIDER=
LLM_MODEL=
```

For Google Gemini:

```env
LLM_PROVIDER=google
GOOGLE_API_KEY=
```

For OpenAI:

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=
```

For the SQL engine, configure a PostgreSQL-compatible connection in Analytics Agent settings or config.

No StreetScore secrets are sent to the browser. Credentials and tokens remain server-side.

---

# Project Structure

Important files include:

```text
src/
├── app/
│   └── api/
│       ├── analytics/
│       │   └── route.ts
│       │
│       └── rep-score/
│           └── explain/
│               └── route.ts
│
├── server/
│   ├── rep-score-explanation.ts
│   └── rep-score-ai-explanation.ts
│
├── components/
│   └── ask-streetscore-card.tsx
│
└── lib/
    ├── analytics-agent/
    │   └── client.ts
    │
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

The Analytics Agent virtual environment is intentionally local and should not be committed:

```text
.analytics-agent-venv/
```

---

# Local Development Setup

## Prerequisites

You will need:

* Node.js
* npm
* PostgreSQL
* Docker Desktop
* Python
* DataHub CLI
* DataHub Analytics Agent

OpenAI is **optional**.

Google Gemini or another supported Analytics Agent provider can be used instead.

You do not need an OpenAI API key to run the local deterministic explanation fallback.

---

# 1. Clone the Repository

Clone the repository and enter the project directory:

```bash
git clone https://github.com/omargarcia10-k/streetscore_project-.git
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
DATABASE_URL=postgresql://user@localhost:5432/chama_standings_test
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

# 14. Install and Configure Analytics Agent

Create a Python environment:

```bash
python3 -m venv .analytics-agent-venv
```

Activate it:

```bash
source .analytics-agent-venv/bin/activate
```

Install Analytics Agent:

```bash
pip install datahub-analytics-agent
```

Verify:

```bash
analytics-agent --help
```

Configure the Analytics Agent under:

```text
~/.datahub/analytics-agent/
```

The Analytics Agent needs access to:

```text
DataHub GMS
StreetScore PostgreSQL
An LLM provider
```

Example:

```env
DATAHUB_GMS_URL=http://localhost:8080
DATAHUB_GMS_TOKEN=

LLM_PROVIDER=google
GOOGLE_API_KEY=
```

If using Google Gemini, enter your own valid API key.

Do not commit this file or the API key.

---

# 15. Start Analytics Agent

Activate the environment:

```bash
source .analytics-agent-venv/bin/activate
```

Start:

```bash
analytics-agent start
```

Verify:

```bash
analytics-agent status
```

Expected:

```text
✓ Running
→ http://localhost:8100
```

Check logs:

```bash
analytics-agent logs
```

The logs should show DataHub tools being loaded.

For example:

```text
Loaded 22 DataHub tools
NativeDataHub 'default': 22/22 tools active
```

Stop the service when finished:

```bash
analytics-agent stop
```

---

# 16. Verify Analytics Agent Configuration

Run:

```bash
python -c "from analytics_agent.config import Settings; s=Settings(); print('Provider:', s.llm_provider); print('Key configured:', bool(s.get_api_key())); print('Model:', s.get_llm_model())"
```

Example successful output:

```text
Provider: google
Key configured: True
Model: gemini-2.0-flash
```

If the output says:

```text
Provider: openai
Key configured: False
```

then the Analytics Agent is still configured for OpenAI and does not have an OpenAI key.

If the output says:

```text
Provider: google
Key configured: False
```

then the Google API key is missing or is not being loaded by the Analytics Agent.

---

# 17. Configure StreetScore -> Analytics Agent

In the StreetScore `.env` file:

```env
ANALYTICS_AGENT_URL=http://localhost:8100
ANALYTICS_DEBUG=false
```

The application connects to the Analytics Agent server-side.

The browser never receives the Analytics Agent API credentials.

---

# 18. Run the MCP Verification Harness

Verify the MCP metadata-provider path:

```bash
npm run verify:datahub-mcp
```

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

# 19. Start StreetScore

Run:

```bash
npm run dev
```

Open:

```text
http://localhost:3000/dashboard/standings
```

---

# 20. Test the REP Score Explain Flow

From the standings page:

1. Select a neighborhood.
2. View the service-provider rankings.
3. Select a provider.
4. Open the REP Score explanation.
5. Confirm that the explanation displays.
6. Verify that the metadata-provider path is functioning.
7. Verify fallback behavior if DataHub or an optional text provider is unavailable.

---

# 21. Test Ask StreetScore

Make sure all three systems are running:

```text
PostgreSQL
DataHub
Analytics Agent
```

Then start StreetScore:

```bash
npm run dev
```

Open:

```text
http://localhost:3000/dashboard/standings
```

Use the **Ask StreetScore** interface.

Try questions such as:

```text
Which provider has the highest REP Score?
```

```text
Which neighborhood has the most providers?
```

```text
Which providers improved their ranking?
```

```text
What factors contribute to the REP Score?
```

The expected flow is:

```text
Question
   ↓
StreetScore /api/analytics
   ↓
Analytics Agent :8100
   ↓
DataHub metadata
   ↓
PostgreSQL engine
   ↓
Generated SQL
   ↓
Answer
   ↓
StreetScore UI
```

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

## Analytics Agent

```env
ANALYTICS_AGENT_URL=http://localhost:8100
ANALYTICS_AGENT_ENGINE=
ANALYTICS_DEBUG=false
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

## Optional Google Gemini Provider

```env
LLM_PROVIDER=google
GOOGLE_API_KEY=
LLM_MODEL=
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

Analytics Agent verification:

```bash
analytics-agent status
```

Analytics Agent logs:

```bash
analytics-agent logs
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

## Analytics Agent: `command not found`

Activate the virtual environment:

```bash
source .analytics-agent-venv/bin/activate
```

Then verify:

```bash
which analytics-agent
```

If it is still unavailable, install the package inside the active environment:

```bash
pip install datahub-analytics-agent
```

Then:

```bash
analytics-agent --help
```

---

## Analytics Agent is not running

Check:

```bash
analytics-agent status
```

Start:

```bash
analytics-agent start
```

Check logs:

```bash
analytics-agent logs
```

---

## Analytics Agent reports `No answer was returned`

Check the Analytics Agent logs:

```bash
analytics-agent logs
```

Then verify:

```bash
python -c "from analytics_agent.config import Settings; s=Settings(); print('Provider:', s.llm_provider); print('Key configured:', bool(s.get_api_key())); print('Model:', s.get_llm_model())"
```

The most common causes are:

* invalid LLM API key
* incorrect model name
* provider quota/rate limit
* Analytics Agent unable to reach DataHub
* Analytics Agent unable to connect to PostgreSQL

---

## Gemini: `API key not valid`

Verify that the environment contains a real key rather than a placeholder:

```env
GOOGLE_API_KEY=YOUR_REAL_KEY
```

Do not use:

```env
GOOGLE_API_KEY=YOUR_GEMINI_API_KEY
```

Verify that Analytics Agent sees the key:

```bash
python -c "from analytics_agent.config import Settings; s=Settings(); print('Provider:', s.llm_provider); print('Key configured:', bool(s.get_api_key()))"
```

Do not print the actual API key to the terminal or commit it to GitHub.

---

## Gemini: `404 model not found`

If you receive:

```text
models/gemini-1.5-flash is not found
```

the selected model is not available for the API version/provider configuration currently being used.

Configure Analytics Agent to use a model supported by the current Gemini API and installed Analytics Agent version.

---

## Gemini: `429 Too Many Requests`

A `429` response means the Gemini API has rejected the request because the current project/model quota or rate limit has been exceeded.

This is not necessarily a DataHub or Analytics Agent connection problem.

The application can continue to function while the LLM provider is unavailable.

If minimizing API usage, avoid repeatedly testing the same prompt and use short questions during development.

---

## Analytics Agent shows the wrong provider

Run:

```bash
python -c "from analytics_agent.config import Settings; s=Settings(); print('Provider:', s.llm_provider)"
```

If you intend to use Google:

```env
LLM_PROVIDER=google
```

Restart the service:

```bash
analytics-agent stop
analytics-agent start
```

Then verify again.

---

## Analytics Agent cannot reach DataHub

Verify DataHub:

```bash
curl http://localhost:8080
```

Then verify Analytics Agent logs:

```bash
analytics-agent logs
```

Look for:

```text
Loaded DataHub tools
NativeDataHub
tools active
```

If DataHub tools load successfully, Analytics Agent is communicating with DataHub.

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
* `.analytics-agent-venv/`
* database passwords
* API keys
* DataHub authentication tokens
* private credentials
* generated local Analytics Agent databases

Use placeholders in:

```text
.env.example
```

If credentials are accidentally exposed, rotate them before publishing the repository.

The Analytics Agent environment should remain local:

```text
~/.datahub/analytics-agent/
```

Do not copy API keys or DataHub tokens into the repository.

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
DATABASE_URL=postgresql://user@localhost:5432/chama_standings_test
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

### 9. Optional: Start Analytics Agent

If testing **Ask StreetScore**, create and activate the Analytics Agent environment:

```bash
python3 -m venv .analytics-agent-venv
source .analytics-agent-venv/bin/activate
pip install datahub-analytics-agent
```

Configure the Analytics Agent with:

```env
DATAHUB_GMS_URL=http://localhost:8080
DATAHUB_GMS_TOKEN=

LLM_PROVIDER=google
GOOGLE_API_KEY=
```

Start:

```bash
analytics-agent start
```

Verify:

```bash
analytics-agent status
```

The Analytics Agent runs at:

```text
http://localhost:8100
```

### 10. Start StreetScore

```bash
npm run dev
```

### 11. Open

```text
http://localhost:3000/dashboard/standings
```

### 12. Test

Use either:

**Explain REP Score**

or:

**Ask StreetScore**

For Ask StreetScore, the Analytics Agent must be running and configured with a supported LLM provider.

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
* Official DataHub Analytics Agent integration
* Natural-language-to-SQL analytics through Analytics Agent
* DataHub metadata context for analytics questions
* PostgreSQL execution through Analytics Agent
* Server-side Analytics Agent integration
* Support for configurable LLM providers
* Local reproducible development setup
* Apache License 2.0

The application is designed so that DataHub metadata can contribute context to the REP Score explanation workflow and the Ask StreetScore analytics workflow while fallback providers maintain functionality when external services are unavailable.

The core application does not require paid OpenAI access to run the deterministic REP Score explanation workflow.
