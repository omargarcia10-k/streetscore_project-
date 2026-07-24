# StreetScore

StreetScore is a neighborhood reputation platform that ranks local service providers using performance-based reputation signals.

Unlike traditional review platforms that rely heavily on advertising visibility, review volume, or paid placement, StreetScore combines multiple trust indicators into a single REP Score to highlight consistent performers within their local markets.

The platform provides neighborhood-based rankings, operator comparisons, verification signals, filtering, and historical ranking movement through a PostgreSQL-backed dashboard.

---

# Project Overview

StreetScore is a full-stack prototype built to explore how local businesses can be evaluated through transparent reputation signals rather than popularity alone.

The application allows users to:

* View operator rankings
* Filter businesses by neighborhood and league
* Compare operators
* Identify verified businesses
* Track REP Score rankings
* Analyze historical ranking movement

Ranking data is retrieved dynamically through PostgreSQL-backed API routes rather than static frontend data.

---

# Features

Current prototype functionality:

* Neighborhood-based standings
* Operator leaderboard rankings
* REP Score display
* League-based rankings
* Neighborhood filtering
* ZIP code filtering
* Verification filtering
* Operator comparison tool
* Verified business indicators
* Responsive dashboard interface
* PostgreSQL-backed API routes
* Historical rank movement tracking
* Database-driven data retrieval

---

# System Architecture

StreetScore follows a full-stack architecture:

```
                 Source Data
                     |
                     ↓
              PostgreSQL Database
                     |
        -----------------------------
        |                           |
 standings_entries          standings_history
        |                           |
        ↓                           ↓
 SQL Ranking Functions     Historical Analytics
              |
              ↓
        Next.js API Routes
              |
              ↓
       React Dashboard UI
```

The application separates current rankings from historical analytics:

* `standings_entries` stores current calculated rankings.
* `standings_history` stores immutable ranking snapshots.
* Historical movement is calculated from snapshot comparisons.

This design allows future support for ranking trends, analytics, and timeline features without changing the core ranking structure.

---

# Technology Stack

## Frontend

* Next.js 16
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
* PostgreSQL functions and views

## Development Tools

* Git
* GitHub
* VS Code
* Biome

## Deployment

* Vercel

---

# Reputation System

StreetScore uses multiple signals to calculate operator reputation.

Current reputation indicators include:

* Average Rating
* Review Count
* Work Volume
* Response Time
* On-Time Percentage
* License Verification
* REP Score
* Ranking Movement

The current repository focuses on ranking visualization and database architecture.

Production scoring models and external data ingestion are future development areas.

---

# Ranking Architecture

StreetScore separates ranking calculations from historical analytics.

## Current Standings

`standings_entries`

Stores the latest calculated ranking information:

* Operator
* League
* Neighborhood
* REP Score
* Current Rank

---

## Historical Rankings

`standings_history`

Stores daily ranking snapshots.

Historical snapshots allow the platform to calculate:

* Rank changes
* 7-day movement
* 30-day movement
* Long-term performance trends

---

## Ranking Refresh Workflow

The ranking workflow:

1. Source data is loaded into PostgreSQL.
2. Current rankings are recalculated.
3. Current standings are stored.
4. A historical snapshot is created.
5. Dashboard APIs retrieve ranking information.

---

# Rank Movement Calculation

Rank movement is calculated using:

```
rank_delta_30d = previous_rank - current_rank
```

Interpretation:

* Positive value → operator moved up
* Negative value → operator moved down
* Zero → no movement
* NULL → no matching historical snapshot exists

Movement calculations compare:

* Operator ID
* League ID
* Neighborhood ID
* Historical snapshot date

---

# Database Structure

Important database files:

## Schema

```
migrations/001_init.sql
```

Creates:

* Database tables
* Relationships
* Constraints

---

## Seed Data

```
migrations/002_seed.sql
```

Loads:

* League data

---

## Standings View

```
migrations/004_create_standings_page_rows_view.sql
```

Creates:

```
standings_page_rows
```

Used by:

```
src/app/api/standings/route.ts
```

---

## Ranking Functions

Ranking generation is handled through PostgreSQL functions.

Important functions:

* `refresh_current_standings()`
* `snapshot_current_standings(snapshot_date)`
* `refresh_current_standings_and_snapshot(snapshot_date)`

---

# API

## Standings API

Location:

```
src/app/api/standings/route.ts
```

Endpoint:

```
GET /api/standings
```

Provides:

* Operator rankings
* REP Scores
* Filtering
* Verification status
* Neighborhood standings

---

# Repository Structure

```
src/
 ├── app/
 │    ├── api/
 │    └── dashboard/
 │
 ├── components/
 ├── hooks/
 ├── lib/
 ├── migrations/
 ├── public/
 └── types/
```

The project uses the Next.js App Router architecture with:

* Reusable React components
* API routes
* Database utilities
* SQL migration files
* Shared UI components

---

# Data Quality

This repository contains prototype data used to validate the StreetScore workflow.

## Verified

The following have been tested:

* Database schema
* API queries
* Dashboard rendering
* Filtering functionality
* Database connectivity
* Production build process
* Historical snapshot generation

## Demo Data

The following values are prototype/demo data:

* Operator records
* REP Scores
* Ranking movement
* Performance metrics

## Limitations

* Reputation scores are prototypes for future development.
* Data accuracy depends on imported records.
* Historical ranking accuracy depends on available snapshots.
* Production ingestion pipelines are outside this repository scope.

---

# Local Development Setup

## 1. Clone Repository

```bash
git clone https://github.com/omargarcia10-k/streetscore_project-.git
```

Navigate into the project:

```bash
cd streetscore_project-
```

---

## 2. Switch Branch

Fetch branches:

```bash
git fetch origin
```

Switch to updates:

```bash
git switch updates
```

If needed:

```bash
git switch --track origin/updates
```

---

## 3. Install Dependencies

```bash
npm install
```

---

# Database Setup

StreetScore supports:

* Local PostgreSQL
* Neon PostgreSQL

For a complete setup:

```bash
npm run db:setup
```

This runs the required database initialization workflow.

---

# Individual Database Commands

Run migrations:

```bash
npm run db:migrate
```

Seed database:

```bash
npm run db:seed
```

Import operator data:

```bash
npm run db:import
```

Create standings view:

```bash
npm run db:view
```

Generate rankings:

```bash
npm run db:rankings
```

Refresh standings and snapshots:

```bash
npm run db:refresh-standings
```

Verify historical ranking data:

```bash
npm run db:verify-history
```

Test rank movement calculations:

```bash
npm run db:test-rank-delta
```

---

# Environment Variables

Create your environment file:

```bash
cp .env.example .env
```

Example:

```env
DATABASE_URL=postgresql://user@localhost:5432/streetscore

NEON_SHARED_DATABASE_URL=your_neon_shared_connection_string

NEON_BRANCH_DATABASE_URL=your_neon_branch_connection_string

USE_DATABASE=local
```


Supported database modes:

```env
USE_DATABASE=local
USE_DATABASE=shared
USE_DATABASE=branch
```

Do not commit `.env` files or database credentials.

---

# Running the Application

Start development server:

```bash
npm run dev
```

Open:

```
http://localhost:3000
```

---

# Build Verification

Run:

```bash
npm run build
```

A successful build confirms:

* TypeScript compilation passes
* Next.js production build succeeds
* Dependencies are configured correctly

---

# Scheduled Ranking Updates

StreetScore supports automated daily ranking snapshots.

The repository includes:

```
.github/workflows/daily-standings-snapshot.yml
```

Scheduled jobs can:

1. Refresh current standings.
2. Create daily snapshots.
3. Preserve historical ranking data.

The same workflow can be executed through:

* GitHub Actions
* Vercel Cron
* Render Cron
* Railway Scheduler
* Manual admin commands

---

# Future Development

Planned improvements:

* Production reputation scoring
* Real-time data ingestion
* Interactive maps
* Search functionality
* Analytics dashboards
* Customer review integration
* Operator profile pages
* Advanced ranking trends

---

# Project Vision

StreetScore is built around the idea that trust should be earned through consistent performance.

By combining meaningful reputation signals into neighborhood-based rankings, StreetScore aims to help customers discover reliable service providers while giving businesses a transparent way to demonstrate quality.

---

# Contributors

## Project Manager / Marketing

* Khadejah Beckles

## Development / Data / Research

* Omar Garcia
* Christopher Rampersaud
