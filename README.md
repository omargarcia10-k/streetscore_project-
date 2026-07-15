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
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/streetscore

USE_DATABASE=local
```

Replace:

```text
YOUR_PASSWORD
```

with your PostgreSQL password.

Example:

```env
DATABASE_URL=postgresql://postgres:mypassword@localhost:5432/streetscore

USE_DATABASE=local
```

Do not commit `.env` files or real database credentials.

---

# 7. Initialize Database

For a fresh project setup run:

```bash
npm run db:setup
```

This creates the required database structure and data.

The setup applies:

## 001_init.sql

Creates:

* Database tables
* Relationships
* Constraints

## 002_seed.sql

Loads:

* Sample operators
* Leagues
* Neighborhoods
* Standings data

## 004_create_standings_page_rows_view.sql

Creates:

```text
standings_page_rows
```

This view is required by:

```text
src/app/api/standings/route.ts
```

---

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
