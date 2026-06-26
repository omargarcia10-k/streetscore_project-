
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
  rank_delta_30d integer NOT NULL DEFAULT 0,
  distance_miles numeric(7,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS score_inputs (
  entry_id VARCHAR(128) PRIMARY KEY REFERENCES standings_entries(entry_id),
  volume_count integer NOT NULL DEFAULT 0 CHECK (volume_count >= 0),
  rating DECIMAL(2,1) NOT NULL CHECK (rating >= 0 AND rating <= 5),
  review_count NUMERIC NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  response_minutes integer NOT NULL DEFAULT 0 CHECK (response_minutes >= 0),
  on_time_percent integer NOT NULL CHECK (on_time_percent >= 0 AND on_time_percent <= 100),
  license_verified Boolean NOT NULL DEFAULT false
);


