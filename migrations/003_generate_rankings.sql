-- 003_generate_rankings.sql
--
-- Generates REP Score and Rank for standings_entries
--
-- REP Score:
-- Rating Quality          50 points
-- Review Strength         30 points
-- License Verification    15 points
-- Data Completeness        5 points


CREATE OR REPLACE FUNCTION refresh_current_standings()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    reranked_count integer := 0;
BEGIN

    /*
     * Calculate REP Scores
     */
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

                        -- Rating Score (50 pts)
                        (
                            COALESCE(si.rating,0) / 5.0 * 50
                        )

                        +

                        -- Review Strength (30 pts)
                        (
                            CASE
                                WHEN COALESCE(si.review_count,0) > 0
                                THEN
                                    LEAST(
                                        1,
                                        LN(si.review_count + 1) / LN(1000)
                                    ) * 30
                                ELSE 0
                            END
                        )

                        +

                        -- License Verification (15 pts)
                        (
                            CASE
                                WHEN si.license_verified = true
                                THEN 15
                                ELSE 0
                            END
                        )

                        +

                        -- Data Completeness (5 pts)
                        (
                            CASE
                                WHEN si.rating IS NOT NULL THEN 2 ELSE 0 END
                            +
                            CASE
                                WHEN si.review_count IS NOT NULL THEN 2 ELSE 0 END
                            +
                            CASE
                                WHEN si.license_verified IS NOT NULL THEN 1 ELSE 0 END
                        )

                    )::integer
                )
            ) AS rep_score

        FROM score_inputs si

    ) calculated

    WHERE se.entry_id = calculated.entry_id;


    /*
     * Recalculate Rankings
     */
    WITH ranked_entries AS (

        SELECT
            se.entry_id,

            ROW_NUMBER() OVER (

                PARTITION BY
                    se.league_id,
                    n.neighborhood_name

                ORDER BY
                    se.rep_score DESC,
                    si.review_count DESC,
                    si.rating DESC,
                    se.entry_id

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


COMMENT ON FUNCTION refresh_current_standings()
IS
'Recalculates REP Scores and rankings using rating quality, review strength, license verification, and data completeness.';


SELECT refresh_current_standings();