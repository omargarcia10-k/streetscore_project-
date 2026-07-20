-- 003_generate_rankings.sql
--
-- Generates REP Score and Rank for standings_entries
--
-- REP Score calculation:
--   Rating             40 points
--   Review Count       35 points
--   License Verified   25 points


-- Ranking:
--   Operators are ranked within:
--   league + neighborhood
--
-- Higher REP Score = Better Rank
--
-- Tie breakers:
--   1. Higher review count
--   2. Higher rating
--   3. Stable entry_id ordering

CREATE OR REPLACE FUNCTION refresh_current_standings()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    reranked_count integer := 0;
BEGIN
    -- Keep ranking logic in SQL so API consumers only read finalized standings.
    UPDATE standings_entries se
    SET rep_score = calculated.rep_score
    FROM (
        SELECT
            si.entry_id,
            LEAST(
                100,
                GREATEST(
                    0,
                    ROUND(
                        (
                            (si.rating / 5.0 * 40)
                            +
                            (LEAST(si.review_count, 500) / 500.0 * 35)
                            +
                            CASE
                                WHEN si.license_verified = true THEN 25
                                ELSE 0
                            END
                        )
                    )::integer
                )
            ) AS rep_score
        FROM score_inputs si
    ) calculated
    WHERE se.entry_id = calculated.entry_id;

    WITH ranked_entries AS (
        SELECT
            se.entry_id,
            ROW_NUMBER() OVER (
                PARTITION BY se.league_id, n.neighborhood_name
                ORDER BY se.rep_score DESC, si.review_count DESC, si.rating DESC, se.entry_id
            ) AS calculated_rank
        FROM standings_entries se
        JOIN score_inputs si
            ON si.entry_id = se.entry_id
        JOIN neighborhoods n
            ON n.neighborhood_id = se.neighborhood_id
    )
    UPDATE standings_entries se
    SET rank = ranked_entries.calculated_rank
    FROM ranked_entries
    WHERE se.entry_id = ranked_entries.entry_id;

    GET DIAGNOSTICS reranked_count = ROW_COUNT;

    RETURN reranked_count;
END;
$$;

COMMENT ON FUNCTION refresh_current_standings() IS
    'Recalculates REP scores and ranking positions for the current standings_entries table.';

SELECT refresh_current_standings();