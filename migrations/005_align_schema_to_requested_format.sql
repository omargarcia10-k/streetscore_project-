BEGIN;

ALTER TABLE neighborhoods
  ALTER COLUMN neighborhood_id TYPE varchar(64);

ALTER TABLE standings_entries
  ALTER COLUMN time_window TYPE varchar(40),
  ALTER COLUMN neighborhood_id TYPE varchar(64);

ALTER TABLE standings_entries
  DROP CONSTRAINT IF EXISTS standings_entries_rep_score_check,
  ADD CONSTRAINT standings_entries_rep_score_check CHECK (rep_score >= 0 AND rep_score <= 100);

ALTER TABLE score_inputs
  DROP CONSTRAINT IF EXISTS score_inputs_rating_check,
  ADD CONSTRAINT score_inputs_rating_check CHECK (rating >= 0 AND rating <= 5),
  DROP CONSTRAINT IF EXISTS score_inputs_response_minutes_check,
  ADD CONSTRAINT score_inputs_response_minutes_check CHECK (response_minutes >= 0),
  DROP CONSTRAINT IF EXISTS score_inputs_on_time_percent_check,
  ADD CONSTRAINT score_inputs_on_time_percent_check CHECK (on_time_percent >= 0 AND on_time_percent <= 100);

COMMIT;