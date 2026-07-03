DROP VIEW IF EXISTS standings_page_rows;

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
  si.response_minutes,
  si.on_time_percent,

  se.rank_delta_30d,
  se.distance_miles

FROM standings_entries se
JOIN operators o ON o.operator_id = se.operator_id
LEFT JOIN leagues l ON l.league_id = se.league_id
LEFT JOIN neighborhoods n ON n.neighborhood_id = se.neighborhood_id
LEFT JOIN score_inputs si ON si.entry_id = se.entry_id;