# REP Score Analysis

## Scope

This document describes the current REP Score implementation in the StreetScore codebase as of 2026-07-30.

No code was changed while producing this analysis.

## Current Architecture

StreetScore computes REP Score in PostgreSQL, exposes ranked data through Next.js API routes, and renders the results in React UI components.

High-level flow:

1. Source data is assembled from JSON files in `data/`.
2. Import scripts load current standings rows and score inputs into PostgreSQL.
3. PostgreSQL functions calculate `rep_score` and `rank`.
4. Historical snapshots are stored separately in `standings_history`.
5. A database view joins ranking, operator, neighborhood, and score input data for API consumption.
6. Next.js API routes return leaderboard rows, comparison data, and operator detail data.
7. Frontend pages and components render REP Score, rank, review metrics, and rank movement.

Primary runtime boundary:

- SQL is the source of truth for REP Score calculation.
- Next.js routes read and reshape score data.
- React components only display returned values.

## Data Flow

### Source and import flow

1. `data/google-enrichment.json` contains rating, review count, Google match metadata, and license verification inputs.
2. `scripts/build-standings-data.js` reads `operators.json`, `neighborhoods.json`, and `google-enrichment.json` and produces:
   - `data/standings-entries.json`
   - `data/score-inputs.json`
3. `scripts/import-data.js` imports those files into:
   - `operators`
   - `neighborhoods`
   - `standings_entries`
   - `score_inputs`
4. `migrations/003_generate_rankings.sql` recalculates `rep_score` and `rank` in `standings_entries`.
5. `migrations/005_update_rank_delta.sql` stores historical snapshots in `standings_history` and computes 30-day rank deltas.
6. `migrations/004_create_standings_page_rows_view.sql` exposes the joined read model `standings_page_rows`.
7. API routes under `src/app/api/` query that view or the underlying tables.
8. Frontend pages under `src/app/` and components under `src/components/` render the returned score data.

### Runtime database access

- `src/lib/db.ts` exports `pool` and `query` for PostgreSQL access.
- API routes use either `pool.query(...)` or `query(...)`.

## REP Score Logic

### REP Score calculation

File:

- `migrations/003_generate_rankings.sql`

Function involved:

- `refresh_current_standings()`

Database source:

- Reads from `score_inputs`
- Updates `standings_entries.rep_score`

Current formula:

- Rating Quality: 50 points
- Review Strength: 30 points
- License Verification: 15 points
- Data Completeness: 5 points

### Score weights

Defined in:

- `migrations/003_generate_rankings.sql`

Weights:

- Rating Quality: `rating / 5.0 * 50`
- Review Strength: `LEAST(1, LN(review_count + 1) / LN(1000)) * 30`
- License Verification: `15` when `license_verified = true`, else `0`
- Data Completeness:
  - `2` points if `rating IS NOT NULL`
  - `2` points if `review_count IS NOT NULL`
  - `1` point if `license_verified IS NOT NULL`

### Normalization

Defined in:

- `migrations/003_generate_rankings.sql`

Normalization behavior:

- Score is rounded with `ROUND(...)::integer`
- Score is bounded with `GREATEST(0, ...)`
- Score is capped with `LEAST(100, ...)`
- Review strength is normalized logarithmically with `LN(review_count + 1) / LN(1000)` and capped at `1`

### Ranking calculation

Defined in:

- `migrations/003_generate_rankings.sql`

Function involved:

- `refresh_current_standings()`

Database source:

- Reads from `standings_entries`
- Joins `score_inputs`
- Joins `neighborhoods`
- Updates `standings_entries.rank`

Ranking logic:

- Uses `ROW_NUMBER()` window function
- Partitions by:
  - `se.league_id`
  - `n.neighborhood_name`
- Orders by:
  - `se.rep_score DESC`
  - `si.review_count DESC`
  - `si.rating DESC`
  - `se.entry_id`

### Historical score logic

Files:

- `migrations/001_init.sql`
- `migrations/005_update_rank_delta.sql`

Functions involved:

- `standings_rank_delta_30d(p_as_of_date DATE DEFAULT CURRENT_DATE)`
- `snapshot_current_standings(p_snapshot_date DATE DEFAULT CURRENT_DATE)`
- `refresh_current_standings_and_snapshot(p_snapshot_date DATE DEFAULT CURRENT_DATE)`

Database source:

- Reads current rows from `standings_entries`
- Reads historical rows from `standings_history`
- Stores historical `rank` and `rep_score` in `standings_history`

Current behavior:

- `snapshot_current_standings(...)` copies one row per current standing into `standings_history`
- `standings_rank_delta_30d(...)` compares the current row against the snapshot from `p_as_of_date - 30`
- `rank_delta_30d = previous_snapshot.rank - current_rank`
- Positive delta means the operator moved up
- `rep_score` history is stored in `standings_history`, but current APIs primarily expose rank movement rather than time-series score history

## Database

### Tables containing REP Score information

#### `standings_entries`

File definitions:

- `migrations/001_init.sql`
- `src/db/schema.ts`

Relevant columns:

- `entry_id`
- `season_id`
- `time_window`
- `league_id`
- `neighborhood_id`
- `zip_code`
- `operator_id`
- `rank`
- `rep_score`
- `distance_miles`

Purpose:

- Stores the current calculated REP Score and current rank.

#### `standings_history`

File definitions:

- `migrations/001_init.sql`
- `migrations/005_update_rank_delta.sql`
- `src/db/schema.ts`

Relevant columns:

- `snapshot_date`
- `league_id`
- `neighborhood_id`
- `operator_id`
- `rank`
- `rep_score`
- `created_at`

Purpose:

- Stores historical snapshots for ranking and score analytics.

#### `score_inputs`

File definitions:

- `migrations/001_init.sql`
- `src/db/schema.ts`

Relevant columns used in current REP Score logic:

- `entry_id`
- `rating`
- `review_count`
- `license_verified`

Additional columns present:

- `volume_count`
- `response_minutes`
- `on_time_percent`

Purpose:

- Stores raw score inputs consumed by the SQL ranking function.

#### `operators`

Relevant columns used in score-related responses:

- `operator_id`
- `operator_name`
- `league_id`
- `operator_type`
- `is_verified`
- `is_current_user`
- `status`

Purpose:

- Supplies operator identity and verification/status metadata used in score displays.

#### `neighborhoods`

Relevant columns:

- `neighborhood_id`
- `league_id`
- `zip_code`
- `neighborhood_name`

Purpose:

- Provides neighborhood partitioning for rankings.

#### `leagues`

Relevant columns:

- `league_id`
- `league_name`
- `volume_label`
- `description`

Purpose:

- Supplies league labels for presentation and filtering.

### Views used

#### `standings_page_rows`

File:

- `migrations/004_create_standings_page_rows_view.sql`

Purpose:

- Main read model for standings pages and comparison APIs.

Selected fields exposed:

- Entry identity and rank
- Operator name/type/status/verification flags
- League and neighborhood labels
- `rep_score`
- `rating`
- `review_count`
- `volume_count`
- `rank_delta_30d`
- `distance_miles`

Joins:

- `standings_entries se`
- `operators o`
- `leagues l`
- `neighborhoods n`
- `score_inputs si`
- `standings_rank_delta_30d() movement`

### Relationships

- `neighborhoods.league_id -> leagues.league_id`
- `operators.league_id -> leagues.league_id`
- `standings_entries.league_id -> leagues.league_id`
- `standings_entries.neighborhood_id -> neighborhoods.neighborhood_id`
- `standings_entries.operator_id -> operators.operator_id`
- `score_inputs.entry_id -> standings_entries.entry_id`
- `standings_history.league_id -> leagues.league_id`
- `standings_history.neighborhood_id -> neighborhoods.neighborhood_id`
- `standings_history.operator_id -> operators.operator_id`

Important constraints:

- `standings_entries.rep_score` is constrained to `0..100`
- `standings_history.rep_score` is constrained to `0..100`
- `standings_entries.rank` and `standings_history.rank` must be `>= 1`
- `score_inputs.rating` is constrained to `0..5`
- `score_inputs.review_count` must be `>= 0` when present

## API

All identified score and ranking routes are `GET` routes.

### `GET /api/standings`

File:

- `src/app/api/standings/route.ts`

Purpose:

- Returns leaderboard rows and summary metrics for a specific league and neighborhood.

Request query params:

- `league` required
- `neighborhood` required
- `window` optional, defaults to `30d`, normalized to `last 30 days`
- `verified` optional, defaults to `all`
- `limit` optional, defaults to `10`

Database sources:

- `standings_page_rows`
- `operators`

Response shape:

- `league`
- `neighborhood`
- `window`
- `metrics`
  - `total`
  - `active`
  - `verified`
- `rows[]`
  - `entryId`
  - `rank`
  - `operatorId`
  - `name`
  - `leagueId`
  - `leagueName`
  - `neighborhoodId`
  - `neighborhoodName`
  - `zipCode`
  - `window`
  - `score`
  - `rating`
  - `reviewCount`
  - `rankDelta30d`
  - `distanceMiles`
  - `status`
  - `is_verified`

### `GET /api/standings/rows`

File:

- `src/app/api/standings/rows/route.ts`

Purpose:

- Returns a larger, filterable standings dataset for the all-shops table.

Request query params:

- `league` optional
- `neighborhood` optional
- `window` optional
- `status` optional, defaults to `all`
- `verified` optional, defaults to `all`
- `search` optional
- `limit` optional, defaults to `5000`, capped at `10000`

Database source:

- `standings_page_rows`

Response shape:

- `count`
- `rows[]`
  - `entryId`
  - `rank`
  - `operatorId`
  - `operatorName`
  - `operatorType`
  - `isVerified`
  - `isCurrentUser`
  - `status`
  - `leagueId`
  - `leagueName`
  - `volumeLabel`
  - `neighborhoodId`
  - `neighborhoodName`
  - `zipCode`
  - `timeWindow`
  - `repScore`
  - `rating`
  - `reviewCount`
  - `volumeCount`
  - `rankDelta30d`
  - `distanceMiles`

### `GET /api/standings/compare`

File:

- `src/app/api/standings/compare/route.ts`

Purpose:

- Returns two selected standings rows for operator comparison.

Request query params:

- `ids` required, comma-separated `entry_id` values
- If `ids.length !== 2`, the route returns `[]`

Database source:

- `standings_page_rows`

Response shape:

- `[]` or array of two rows
- Returned fields:
  - `entryId`
  - `name`
  - `rank`
  - `score`
  - `rating`
  - `reviewCount`
  - `neighborhood`
  - `status`
  - `is_verified`

### `GET /api/operators/[id]`

File:

- `src/app/api/operators/[id]/route.ts`

Purpose:

- Returns a single operator profile with REP Score, rank, and raw rating/review inputs.

Request params:

- Path param: `id`

Database sources:

- `operators`
- `standings_entries`
- `neighborhoods`
- `score_inputs`

Response shape:

- `operator_id`
- `operator_name`
- `operator_type`
- `status`
- `is_verified`
- `neighborhood_name`
- `rating`
- `review_count`
- `rep_score`
- `rank`

Notes:

- This route joins directly against base tables rather than `standings_page_rows`.
- It is the narrowest current API surface for a single-operator REP Score view.

## Frontend

### Pages showing REP Score

#### Dashboard standings page

File:

- `src/app/(main)/dashboard/standings/page.tsx`

Current use:

- Main public rankings experience
- Fetches `GET /api/standings`
- Displays leaderboard, top three cards, filtering, and comparison dialog entry

REP Score shown in:

- Top hero copy
- Top three cards
- Hover card details
- Table row operator hover card

#### All shops page

File:

- `src/app/(main)/dashboard/shops/page.tsx`

Current use:

- Wraps the all-shops table
- Uses `StandingsRowsTable`

#### Operator detail page

File:

- `src/app/operators/[id]/page.tsx`

Current use:

- Fetches `GET /api/operators/[id]`
- Displays REP Score, rank, rating, review count, verification, type, and status

### Ranking components

#### `src/components/standings-table.tsx`

Current use:

- Loads top leaderboard rows from `GET /api/standings`
- Displays rank badge, trend, and operator hover card

#### `src/components/standings-rows-table.tsx`

Current use:

- Loads large result sets from `GET /api/standings/rows`
- Displays REP Score, rank change, rating, reviews, status, league, type, neighborhood, and ZIP

#### `src/components/top-three-cards.tsx`

Current use:

- Reuses standings row data for the top three visual summary cards
- Displays REP Score, rating, review count, and verification state

#### `src/components/compare-content.tsx`

Current use:

- Fetches `GET /api/standings/compare`
- Displays side-by-side REP Score, rating, reviews, neighborhood, and status

### Existing UI components that can be reused

#### Score and operator display

- `src/components/operator-hover-card.tsx`
- `src/components/top-three-cards.tsx`
- `src/components/compare-content.tsx`
- `src/components/compare-dialog.tsx`

#### Layout and primitives

- `src/components/ui/card.tsx`
- `src/components/ui/table.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/hover-card.tsx`
- `src/components/ui/badge.tsx`

These are the existing components most immediately reusable for any REP Score explanation or metadata display without changing the scoring model.

## Integration Points

Current integration boundaries in the existing codebase:

### SQL scoring boundary

- `migrations/003_generate_rankings.sql`
- `refresh_current_standings()`

This is the source of truth for score math and should be treated as the canonical scoring layer.

### Historical analytics boundary

- `migrations/005_update_rank_delta.sql`
- `standings_rank_delta_30d(...)`
- `snapshot_current_standings(...)`
- `refresh_current_standings_and_snapshot(...)`

This is the source of truth for rank movement and historical snapshots.

### Read model boundary

- `migrations/004_create_standings_page_rows_view.sql`

This is the main joined read model already used by standings APIs.

### Single-operator boundary

- `src/app/api/operators/[id]/route.ts`
- `src/app/operators/[id]/page.tsx`

This is the narrowest existing path for operator-level score detail.

### Bulk leaderboard boundary

- `src/app/api/standings/route.ts`
- `src/app/api/standings/rows/route.ts`
- `src/app/api/standings/compare/route.ts`

These routes already distribute scored and ranked data across the dashboard.

## Files Likely To Change

These are the existing files most likely to change for future REP Score-related enhancements because they already own the relevant data boundaries:

- `migrations/003_generate_rankings.sql`
  - Owns score calculation and ranking logic.
- `migrations/004_create_standings_page_rows_view.sql`
  - Owns the read model returned by standings APIs.
- `migrations/005_update_rank_delta.sql`
  - Owns historical snapshot and rank delta logic.
- `src/app/api/operators/[id]/route.ts`
  - Smallest API surface for single-operator score detail.
- `src/app/operators/[id]/page.tsx`
  - Smallest UI surface for detailed operator-level REP Score presentation.
- `src/app/api/standings/route.ts`
  - Owns leaderboard payload shape used by the main standings page.
- `src/app/api/standings/rows/route.ts`
  - Owns the bulk standings payload shape for the all-shops table.
- `src/components/operator-hover-card.tsx`
  - Reusable score summary component.
- `src/components/top-three-cards.tsx`
  - Reusable leaderboard score summary component.
- `src/components/compare-content.tsx`
  - Existing comparison surface for score-related metrics.
- `scripts/build-standings-data.js`
  - Current bridge from enrichment JSON to score input JSON.
- `scripts/import-data.js`
  - Current bridge from JSON to PostgreSQL source tables.

## Current Gaps Explicitly Not Found

I cannot locate this information in the current project:

- Any existing AI provider integration for REP Score explanations
- Any existing DataHub integration
- Any operator-level metadata table beyond the current operator base fields
- Any dedicated REP Score explanation route
- Any dedicated score component-breakdown API response

## Summary

The existing system is centered on a database-first scoring model.

- Raw inputs live in `score_inputs`.
- Current calculated scores live in `standings_entries`.
- Historical score and rank snapshots live in `standings_history`.
- `standings_page_rows` is the main joined read model.
- The main current frontend surfaces are the standings page, all-shops page, comparison dialog, hover cards, and operator detail page.
- The smallest current operator-level score detail path is `GET /api/operators/[id]` plus `src/app/operators/[id]/page.tsx`.