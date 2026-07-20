
CREATE TABLE IF NOT EXISTS leagues (
  league_id varchar(32) PRIMARY KEY,
  league_name varchar(80) NOT NULL,
  volume_label varchar(40) NOT NULL,
  description text
);

CREATE TABLE IF NOT EXISTS neighborhoods (
  neighborhood_id varchar(64) PRIMARY KEY,
  league_id varchar(32) NOT NULL REFERENCES leagues(league_id),
  zip_code varchar(10) NOT NULL,
  neighborhood_name varchar(80) NOT NULL
);

CREATE TABLE IF NOT EXISTS operators (
  operator_id VARCHAR(96) PRIMARY KEY,
  operator_name VARCHAR(120) NOT NULL,
  league_id VARCHAR(32) NOT NULL REFERENCES leagues(league_id),
  operator_type VARCHAR(80),
  is_verified Boolean NOT NULL DEFAULT false,
  is_current_user Boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE IF NOT EXISTS standings_entries (
  entry_id VARCHAR(128) PRIMARY KEY,
  season_id VARCHAR(20) NOT NULL,
  time_window VARCHAR(40) NOT NULL,
  league_id VARCHAR(32) NOT NULL REFERENCES leagues(league_id),
  neighborhood_id VARCHAR(64) NOT NULL REFERENCES neighborhoods(neighborhood_id),
  zip_code VARCHAR(10) NOT NULL,
  operator_id VARCHAR(96) NOT NULL REFERENCES operators(operator_id),
  rank integer NOT NULL CHECK (rank >= 1),
  rep_score integer NOT NULL CHECK (rep_score >= 0 AND rep_score <= 100),
  distance_miles numeric(7,2) NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS standings_history (
  snapshot_date DATE NOT NULL,
  league_id VARCHAR(32) NOT NULL REFERENCES leagues(league_id),
  neighborhood_id VARCHAR(64) NOT NULL REFERENCES neighborhoods(neighborhood_id),
  operator_id VARCHAR(96) NOT NULL REFERENCES operators(operator_id),
  rank integer NOT NULL CHECK (rank >= 1),
  rep_score integer NOT NULL CHECK (rep_score >= 0 AND rep_score <= 100),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (snapshot_date, league_id, neighborhood_id, operator_id)
);

CREATE TABLE IF NOT EXISTS score_inputs (
  entry_id VARCHAR(128) PRIMARY KEY REFERENCES standings_entries(entry_id),
  volume_count integer NULL DEFAULT 0 CHECK (volume_count >= 0),
  rating DECIMAL(2,1) NOT NULL CHECK (rating >= 0 AND rating <= 5),
  review_count NUMERIC NULL DEFAULT 0 CHECK (review_count >= 0),
  license_verified Boolean NOT NULL DEFAULT false,
  response_minutes integer Null DEFAULT 0,
  on_time_percent numeric NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS standings_history_operator_id_idx
  ON standings_history (operator_id);

CREATE INDEX IF NOT EXISTS standings_history_snapshot_date_idx
  ON standings_history (snapshot_date);

CREATE INDEX IF NOT EXISTS standings_history_league_neighborhood_idx
  ON standings_history (league_id, neighborhood_id);

CREATE INDEX IF NOT EXISTS standings_history_snapshot_date_league_idx
  ON standings_history (snapshot_date, league_id);

COMMENT ON TABLE standings_entries IS
  'Current rankings only. Historical movement is derived from standings_history snapshots.';

COMMENT ON TABLE standings_history IS
  'Historical ranking snapshots captured from standings_entries for movement, trend, and timeline analytics.';

COMMENT ON COLUMN standings_history.snapshot_date IS
  'Snapshot day used for exact-date historical comparisons such as 30 day movement.';

COMMENT ON COLUMN standings_history.rep_score IS
  'REP Score captured at snapshot time so future analytics can graph score history without schema changes.';

CREATE OR REPLACE FUNCTION standings_rank_delta_30d(p_as_of_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  league_id VARCHAR(32),
  neighborhood_id VARCHAR(64),
  operator_id VARCHAR(96),
  current_rank integer,
  rank_30_days_ago integer,
  rank_delta_30d integer
)
LANGUAGE sql
AS $$
  SELECT
    se.league_id,
    se.neighborhood_id,
    se.operator_id,
    se.rank AS current_rank,
    previous_snapshot.rank AS rank_30_days_ago,
    CASE
      WHEN previous_snapshot.rank IS NULL THEN NULL
      ELSE previous_snapshot.rank - se.rank
    END AS rank_delta_30d
  FROM standings_entries se
  LEFT JOIN standings_history previous_snapshot
    ON previous_snapshot.snapshot_date = p_as_of_date - 30
   AND previous_snapshot.league_id = se.league_id
   AND previous_snapshot.neighborhood_id = se.neighborhood_id
   AND previous_snapshot.operator_id = se.operator_id;
$$;

COMMENT ON FUNCTION standings_rank_delta_30d(DATE) IS
  'Reusable historical comparison query. Positive deltas mean an operator moved up because previous_rank - current_rank is positive.';


