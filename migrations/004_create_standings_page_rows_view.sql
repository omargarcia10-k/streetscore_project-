CREATE OR REPLACE VIEW standings_page_rows AS
SELECT
  se.entry_id,
  se.rank,
  se.operator_id,
  o.operator_name,
  se.league_id,
  l.league_name,
  se.neighborhood_id,
  n.neighborhood_name,
  se.zip_code,
  se.time_window,
  se.rep_score,
  si.rating,
  si.review_count,
  se.rank_delta_30d,
  se.distance_miles,
  o.status
FROM standings_entries se
JOIN operators o ON o.operator_id = se.operator_id
LEFT JOIN leagues l ON l.league_id = se.league_id
LEFT JOIN neighborhoods n ON n.neighborhood_id = se.neighborhood_id
LEFT JOIN score_inputs si ON si.entry_id = se.entry_id;