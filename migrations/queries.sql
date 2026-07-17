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

-- Query 4: Current user rank
SELECT
    operator_name,
    rank
FROM standings_page_rows
WHERE is_current_user = TRUE;

SELECT
    COUNT(*) AS total,
    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
    SUM(CASE WHEN is_verified THEN 1 ELSE 0 END) AS verified
FROM operators
WHERE league_id = $1;

