-- 005_generate_rankings.sql
--
-- Generates REP Score and Rank for standings_entries
--
-- REP Score calculation:
--   Rating             30 points
--   Review Count       20 points
--   Response Time      15 points
--   On-Time Percentage 25 points
--   License Verified   10 points
--
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


BEGIN;


--------------------------------------------------
-- Step 1: Calculate REP Score
--------------------------------------------------

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
                        -- Rating (30 points)
                        (si.rating / 5.0 * 30)

                        +

                        -- Review count (20 points)
                        (LEAST(si.review_count, 500) / 500.0 * 20)

                        +

                        -- Response time (15 points)
                        -- Faster response receives more points
                        (
                            (1 - LEAST(si.response_minutes, 240) / 240.0)
                            * 15
                        )

                        +

                        -- On-time percentage (25 points)
                        (si.on_time_percent / 100.0 * 25)

                        +

                        -- License verification (10 points)
                        CASE
                            WHEN si.license_verified = true
                            THEN 10
                            ELSE 0
                        END
                    )
                )::integer

            )
        ) AS rep_score

    FROM score_inputs si

) calculated

WHERE se.entry_id = calculated.entry_id;



--------------------------------------------------
-- Step 2: Generate Rankings
--------------------------------------------------

WITH ranked_entries AS (

    SELECT

        se.entry_id,

        ROW_NUMBER() OVER (

            PARTITION BY
                se.league_id,
                se.neighborhood_id

            ORDER BY

                se.rep_score DESC,

                si.review_count DESC,

                si.rating DESC,

                se.entry_id

        ) AS calculated_rank


    FROM standings_entries se

    JOIN score_inputs si

        ON si.entry_id = se.entry_id

)


UPDATE standings_entries se


SET rank = ranked_entries.calculated_rank


FROM ranked_entries


WHERE se.entry_id = ranked_entries.entry_id;



COMMIT;