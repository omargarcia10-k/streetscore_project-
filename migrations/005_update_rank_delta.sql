DROP VIEW IF EXISTS standings_page_rows;

ALTER TABLE standings_entries
	DROP COLUMN IF EXISTS rank_delta_30d;

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

CREATE INDEX IF NOT EXISTS standings_history_operator_id_idx
	ON standings_history (operator_id);

CREATE INDEX IF NOT EXISTS standings_history_snapshot_date_idx
	ON standings_history (snapshot_date);

CREATE INDEX IF NOT EXISTS standings_history_league_neighborhood_idx
	ON standings_history (league_id, neighborhood_id);

CREATE INDEX IF NOT EXISTS standings_history_snapshot_date_league_idx
	ON standings_history (snapshot_date, league_id);

COMMENT ON TABLE standings_history IS
	'Historical ranking snapshots captured from standings_entries for movement, trend, and timeline analytics.';

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

CREATE OR REPLACE FUNCTION snapshot_current_standings(p_snapshot_date DATE DEFAULT CURRENT_DATE)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
	inserted_count integer := 0;
BEGIN
	-- Snapshots are stored separately so movement can be recomputed for any period without mutating current standings.
	INSERT INTO standings_history (
		snapshot_date,
		league_id,
		neighborhood_id,
		operator_id,
		rank,
		rep_score
	)
	SELECT
		p_snapshot_date,
		se.league_id,
		se.neighborhood_id,
		se.operator_id,
		se.rank,
		se.rep_score
	FROM standings_entries se
	ON CONFLICT (snapshot_date, league_id, neighborhood_id, operator_id) DO NOTHING;

	GET DIAGNOSTICS inserted_count = ROW_COUNT;

	RETURN inserted_count;
END;
$$;

COMMENT ON FUNCTION snapshot_current_standings(DATE) IS
	'Saves one historical snapshot row per current standings entry for the requested day and skips duplicates.';

CREATE OR REPLACE FUNCTION refresh_current_standings_and_snapshot(p_snapshot_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
	reranked_entries integer,
	inserted_snapshots integer
)
LANGUAGE plpgsql
AS $$
DECLARE
	reranked_count integer := 0;
	inserted_count integer := 0;
BEGIN
	reranked_count := refresh_current_standings();
	inserted_count := snapshot_current_standings(p_snapshot_date);

	RETURN QUERY
	SELECT reranked_count, inserted_count;
END;
$$;

COMMENT ON FUNCTION refresh_current_standings_and_snapshot(DATE) IS
	'Automation entry point for cron jobs, scheduled tasks, GitHub Actions, and manual admin commands. Recalculates current rankings, stores one snapshot per operator, and skips duplicate rows for the same snapshot date.';

CREATE VIEW standings_page_rows AS
SELECT
	se.entry_id,
	se.rank,
	se.operator_id,
	o.operator_name,
	o.operator_type,
	o.is_verified,
	o.is_current_user,
	o.status,
	se.league_id,
	l.league_name,
	l.volume_label,
	se.neighborhood_id,
	n.neighborhood_name,
	se.zip_code,
	se.time_window,
	se.rep_score,
	si.rating,
	si.review_count,
	si.volume_count,
	movement.rank_delta_30d,
	se.distance_miles
FROM standings_entries se
JOIN operators o ON o.operator_id = se.operator_id
LEFT JOIN leagues l ON l.league_id = se.league_id
LEFT JOIN neighborhoods n ON n.neighborhood_id = se.neighborhood_id
LEFT JOIN score_inputs si ON si.entry_id = se.entry_id
LEFT JOIN standings_rank_delta_30d() movement
	ON movement.league_id = se.league_id
 AND movement.neighborhood_id = se.neighborhood_id
 AND movement.operator_id = se.operator_id;

COMMENT ON VIEW standings_page_rows IS
	'Current standings rows joined with computed historical movement. rank_delta_30d is derived from exact-date snapshots, never stored on standings_entries.';
