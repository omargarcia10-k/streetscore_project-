-- Query 1: Top operators by ZIP
SELECT
    rank,
    operator_name,
    rep_score
FROM standings_page_rows
WHERE zip_code = '11237'
ORDER BY rank;

-- Query 2: Verified operators
SELECT
    operator_name,
    rep_score
FROM standings_page_rows
WHERE is_verified = TRUE
ORDER BY rep_score DESC;

-- Query 3: Fastest response time
SELECT
    operator_name,
    response_minutes
FROM standings_page_rows
ORDER BY response_minutes ASC
LIMIT 10;

-- Query 4: Current user rank
SELECT
    operator_name,
    rank
FROM standings_page_rows
WHERE is_current_user = TRUE;