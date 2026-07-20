# StreetScore

StreetScore is a neighborhood reputation platform that helps users discover trusted local service providers based on performance signals rather than advertising spend or review count alone.

The platform ranks operators within specific neighborhoods and ZIP codes using a REP Score system that combines multiple trust indicators into a single ranking metric. Instead of simply listing businesses, StreetScore highlights operators that consistently perform well within their local markets.

---

# Project Overview

This repository contains the StreetScore standings prototype built with:

* Next.js
* TypeScript
* React
* PostgreSQL
* Neon PostgreSQL
* Tailwind CSS

The application demonstrates how local service operators can be ranked and filtered by:

* League
* Neighborhood
* ZIP code
* Verification status
* Reputation metrics

The dashboard retrieves ranking data through PostgreSQL-backed API routes rather than static frontend data.

---

# Problem

Finding trustworthy local service providers is difficult.

Consumers often rely on multiple sources:

* Google Reviews
* Yelp
* Facebook
* Personal referrals

These sources provide useful information but do not always represent consistent performance. Review volume and paid visibility do not necessarily indicate quality.

StreetScore explores a model where multiple trust indicators are combined into a transparent reputation score.

---

# Current Features

The current prototype includes:

* Neighborhood standings
* Operator rankings
* REP Score display
* League-based rankings
* ZIP code filtering
* Verification filtering
* PostgreSQL-backed API routes
* Responsive dashboard interface
* Dynamic database-driven data retrieval
* Snapshot-based historical rank movement

---

# Reputation Signals

StreetScore is designed to incorporate:

* Average Rating
* Review Count
* Work Volume
* Response Time
* On-Time Percentage
* Verification Status
* Ranking Movement
* REP Score

The current repository focuses on ranking visualization and filtering. Production scoring algorithms and data ingestion are future development areas.

---

# Technology Stack

## Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS

## Backend

* Next.js API Routes
* PostgreSQL
* Neon PostgreSQL

## Database Tools

* SQL migrations
* Drizzle ORM utilities

## Development Tools

* Git
* GitHub
* VS Code

## Deployment

* Vercel

---

# Repository Structure

```text
app/
components/
hooks/
lib/
migrations/
public/
types/
```

The project uses the Next.js App Router architecture with:

* Reusable React components
* API routes
* Database utilities
* SQL migration files

---

# Developer References

## API

Standings API:

```text
src/app/api/standings/route.ts
```

Endpoint:

```text
GET /api/standings
```

The dashboard retrieves leaderboard information through this API route.

---

## Database Files

Database schema:

```text
migrations/001_init.sql
```

Seed data:

```text
migrations/002_seed.sql
```

Database view:

```text
migrations/004_create_standings_page_rows_view.sql
```

Example queries:

```text
migrations/queries.sql
```

---

# Data Quality

This repository contains prototype data used to validate the StreetScore dashboard workflow.

## Verified

The following have been tested:

* Database schema
* API queries
* Dashboard rendering
* Filtering functionality
* Database connectivity
* Application build process

## Mock / Demo Data

The following values are demonstration data:

* Operator records
* REP Scores
* Ranking movement
* Performance metrics

## Assumptions

* Reputation scoring models are prototypes for future development.
* Production data ingestion is outside this repository scope.

## Limitations

* Data quality depends on the records loaded into PostgreSQL.
* Some metrics may not represent production performance.
* Historical ranking accuracy depends on available source data.

---

# Ranking Architecture

StreetScore separates current standings from historical snapshots.

* `standings_entries` stores only the latest calculated rankings.
* `standings_history` stores immutable daily ranking snapshots.
* `standings_page_rows.rank_delta_30d` is computed at query time from history instead of stored on the current standings table.

This keeps current ranking updates simple while making historical analytics extensible. Future metrics such as 7-day, 30-day, 90-day, yearly movement, REP Score charts, best rank, worst rank, and timeline APIs can all build on the same snapshot table without changing the schema.

## Snapshot Generation

Use the SQL functions below to manage rankings and snapshots:

* `refresh_current_standings()` recalculates REP Score and current rank inside PostgreSQL.
* `snapshot_current_standings(snapshot_date)` copies the current standings into `standings_history` and skips duplicate rows for the same day.
* `refresh_current_standings_and_snapshot(snapshot_date)` is the automation entry point for cron jobs, scheduled tasks, GitHub Actions, Vercel Cron, or manual admin commands.

Manual command:

```bash
npm run db:refresh-standings
```

## Rank Movement Calculation

Movement is calculated entirely in SQL with the formula:

```text
rank_delta_30d = previous_rank - current_rank
```

Interpretation:

* Positive value: operator moved up in the rankings.
* Negative value: operator moved down in the rankings.
* Zero: no movement.
* `NULL`: there is no snapshot from exactly 30 days earlier yet.

The reusable SQL helper `standings_rank_delta_30d(as_of_date)` compares `standings_entries` to `standings_history` on matching `operator_id`, `league_id`, and `neighborhood_id` for an exact 30-day offset.

## Scheduled Jobs

Scheduled automation should execute `refresh_current_standings_and_snapshot()` once per day after source data is loaded.

Expected flow:

* Recalculate current standings.
* Insert one snapshot row per operator for the current date.
* Skip duplicates if the job is retried later the same day.

Repository helpers:

* `npm run db:verify-history` checks that the table, indexes, constraints, functions, and view exist and prints sample rows.
* `npm run db:test-rank-delta` performs a rollback-safe 30-day movement simulation and verifies that `rank_delta_30d = previous_rank - current_rank`.

### GitHub Actions Scheduler

The repository includes [daily-standings-snapshot.yml](.github/workflows/daily-standings-snapshot.yml), which runs once per day and can also be launched manually.

Configuration:

* Add `DATABASE_URL`, `NEON_SHARED_DATABASE_URL`, and `NEON_BRANCH_DATABASE_URL` as GitHub Actions secrets as needed.
* Set repository variable `STREETSCORE_SNAPSHOT_DATABASE` to `shared`, `branch`, or `local` for scheduled runs.
* Manual dispatch lets you choose the database target per run.

Other schedulers can execute the same command:

```bash
npm run db:refresh-standings
```

This works for cron, Vercel Cron, Render Cron, Railway Scheduler, and similar systems because the script is idempotent for the current day.

This design is intentionally future-proof for historical APIs, shop profile ranking timelines, rolling movement windows, and trend analysis.

## Troubleshooting `rank_delta_30d`

If `rank_delta_30d` remains `NULL`, check the following:

* Confirm a snapshot exists for today with `npm run db:verify-history`.
* Confirm there is a snapshot from exactly 30 days earlier for the same `operator_id`, `league_id`, and `neighborhood_id`.
* Confirm the operator exists in `standings_entries`; operators without a current standings row will not produce a historical snapshot.
* Re-run `npm run db:refresh-standings` and verify that it exits successfully.
* Verify `USE_DATABASE` points at the database you expect before running migration or snapshot commands.

---

# Local Setup Guide

Follow these steps to run StreetScore locally.

---

# 1. Clone the Repository

Clone the repository:

```bash
git clone https://github.com/omargarcia10-k/streetscore_project-.git
```

Navigate into the project:

```bash
cd streetscore_project-
```

---

# 2. Switch to Updates Branch

Fetch available branches:

```bash
git fetch origin
```

Switch branches:

```bash
git switch updates
```

If the branch does not exist locally:

```bash
git switch --track origin/updates
```

Verify:

```bash
git branch
```

Expected:

```text
* updates
```

---

# 3. Install Dependencies

Install project packages:

```bash
npm install
```

---

# 4. Install PostgreSQL Locally

StreetScore can run using:

* Local PostgreSQL database
* Neon PostgreSQL database

For local development, install PostgreSQL:

https://www.postgresql.org/download/

During installation:

* Install PostgreSQL Server
* Install pgAdmin (recommended)
* Create a password for the PostgreSQL user
* Keep the default port:

```text
5432
```

Verify installation:

```bash
psql --version
```

---

# 5. Create Local PostgreSQL Database

## Option A: PostgreSQL Terminal

Open PostgreSQL:

```bash
psql postgres
```

Create database:

```sql
CREATE DATABASE streetscore;
```

Verify:

```sql
\l
```

Exit:

```sql
\q
```

---

## Option B: pgAdmin

1. Open pgAdmin
2. Connect to PostgreSQL server
3. Right-click:

```text
Databases
```

4. Select:

```text
Create → Database
```

5. Name:

```text
streetscore
```

6. Save

---

# 6. Configure Environment Variables

Create environment file:

```bash
cp .env.example .env
```

Update:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/databasename

USE_DATABASE=local
```

Replace:

```text
YOUR_PASSWORD
```

with your PostgreSQL password. becomes username.

Example:

```env
DATABASE_URL=postgresql://postgres:John@localhost:5432/streetscore

USE_DATABASE=local
```

Do not commit `.env` files or real database credentials.

---

# 7. Initialize Database
For a fresh project setup run:

```bash
npm run db:setup
```
(MOVE ON TO STEP 8, BELOW IS COMANDS TO SET UP INDIVIDUAL FILE)
===================================================

## 001_init.sql

```bash
npm run db:migrate
```
This creates schema

The setup applies:

Creates:

* Database tables
* Relationships
* Constraints

## 002_seed.sql

```bash
npm run db:seed
```

Loads and inserts data into leagues table:

* Leagues

## imports omars data 

```bash
npm run db:import
```


this creates the stangings_page_row_view

## 004_create_standings_page_rows_view.sql

```bash
npm run db:view
```

Creates:

```text
standings_page_rows
```

This view is required by:

```text
src/app/api/standings/route.ts
```

## 003 generate rankings 

```bash
npm run db:rankings 
```

===================================================

# 8. Verify Database

Connect:

```bash
psql streetscore
```

View tables:

```sql
\dt
```

View database views:

```sql
\dv
```

Expected:

```text
standings_page_rows
```

Exit:

```sql
\q
```

---

# 9. Run Application

Start development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

# 10. Build Verification

Run:

```bash
npm run build
```

A successful build confirms:

* TypeScript compilation passes
* Next.js production build succeeds
* Application dependencies are configured correctly

---

# Neon Database Setup (Optional)

To use Neon instead of local PostgreSQL:

1. Replace `DATABASE_URL` with your Neon connection string.
2. Update:

```env
USE_DATABASE=shared
```

or:

```env
USE_DATABASE=branch
```

3. Run:

```bash
npm run db:setup
```

4. Start:

```bash
npm run dev
```

---

# Future Development

Planned improvements:

* Production reputation scoring
* Historical ranking trends
* Interactive maps
* Search functionality
* Analytics dashboard
* Customer review integration

---

# Project Vision

StreetScore is built on the idea that trust should be earned through consistent performance rather than purchased through advertising.

By combining meaningful reputation signals into neighborhood-based rankings, StreetScore aims to help customers find reliable operators while giving businesses a transparent way to demonstrate quality.

---

# Authors

Developed as part of the CHAMA neighborhood reputation platform project.

Project Manager / Marketing:
Khadejah Beckles

Data / Frontend / Research:
Omar Garcia and Christopher Rampersaud
