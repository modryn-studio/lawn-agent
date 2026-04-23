-- Lawn Agent — Full Funnel Snapshot
-- Run in Neon console whenever you want a health check.
-- "Proposal viewed" is NOT in the DB — use Vercel Analytics /onboarding pageviews for that stage.
-- Stages come from proposal_telemetry (anonymous, no user FK).
-- Silent pass count is estimated: /onboarding pageviews - properties count - waitlist pass rows.
--
-- proposal_content JSONB (added migration 010) stores the full Claude proposal for every anon run.
-- On-demand queries you can run separately:
--   Top products recommended:
--     SELECT proposal_content->>'product_suggestion' AS product, COUNT(*) FROM proposal_telemetry
--     WHERE proposal_content IS NOT NULL GROUP BY 1 ORDER BY 2 DESC;
--   Conversion rate by category:
--     SELECT proposal_category,
--            COUNT(*) FILTER (WHERE outcome='approved') AS approved,
--            COUNT(*) FILTER (WHERE outcome='passed')  AS passed,
--            COUNT(*) FILTER (WHERE outcome IS NULL)   AS bounced
--     FROM proposal_telemetry GROUP BY 1 ORDER BY 1;
--   Avg estimated cost for approved vs passed:
--     SELECT outcome, ROUND(AVG((proposal_content->>'estimated_cost_usd')::numeric),2) AS avg_cost_usd
--     FROM proposal_telemetry WHERE proposal_content IS NOT NULL GROUP BY 1;

-- ── Section 1: Funnel counts ──────────────────────────────────────────────────
SELECT stage, count FROM (

  SELECT 1 AS ord, 'Proposals generated (anon)',           COUNT(*)::int AS count
  FROM proposal_telemetry

  UNION ALL
  SELECT 2, 'Approved in onboarding',                      COUNT(*)::int
  FROM proposal_telemetry WHERE outcome = 'approved'

  UNION ALL
  SELECT 3, 'Passed in onboarding',                        COUNT(*)::int
  FROM proposal_telemetry WHERE outcome = 'passed'

  UNION ALL
  SELECT 4, 'Bounced (no outcome captured)',               COUNT(*)::int
  FROM proposal_telemetry WHERE outcome IS NULL

  UNION ALL
  SELECT 5, 'Completed onboarding (signed up)',            COUNT(*)::int
  FROM properties

  UNION ALL
  SELECT 6, 'Active proposals (pending)',                  COUNT(*)::int
  FROM proposals WHERE status = 'pending'

  UNION ALL
  SELECT 7, 'Completed actions (I did this)',              COUNT(*)::int
  FROM proposals WHERE status = 'done'

  UNION ALL
  SELECT 8, 'Product link taps (commerce_click)',          COUNT(*)::int
  FROM property_interactions WHERE interaction_type = 'commerce_click'

  UNION ALL
  SELECT 9, 'Passed — left email',                        COUNT(*)::int
  FROM waitlist WHERE source = 'pass'

  UNION ALL
  SELECT 10, 'Passed — silent (not in DB)',                NULL::int

  UNION ALL
  SELECT 11, 'Non-US captured',                           COUNT(*)::int
  FROM waitlist WHERE source = 'non_us'

) t ORDER BY ord;

-- ── Section 2: Category breakdown (what is being recommended) ─────────────────
SELECT
  proposal_category                                               AS category,
  COUNT(*)                                                        AS total,
  COUNT(*) FILTER (WHERE outcome = 'approved')                    AS approved,
  COUNT(*) FILTER (WHERE outcome = 'passed')                      AS passed,
  COUNT(*) FILTER (WHERE outcome IS NULL)                         AS bounced,
  ROUND(
    COUNT(*) FILTER (WHERE outcome = 'approved')::numeric
    / NULLIF(COUNT(*) FILTER (WHERE outcome IN ('approved','passed')), 0) * 100
  , 0)                                                            AS approve_rate_pct
FROM proposal_telemetry
GROUP BY 1
ORDER BY total DESC;

-- ── Section 3: Top products recommended (anon runs with content stored) ───────
SELECT
  COALESCE(proposal_content->>'product_suggestion', '(no product)') AS product,
  COUNT(*)                                                            AS times_recommended,
  COUNT(*) FILTER (WHERE outcome = 'approved')                        AS approved,
  COUNT(*) FILTER (WHERE outcome = 'passed')                          AS passed
FROM proposal_telemetry
WHERE proposal_content IS NOT NULL
GROUP BY 1
ORDER BY times_recommended DESC
LIMIT 20;

-- ── Section 4: Recent anonymous runs (last 10, full detail) ──────────────────
SELECT
  generated_at::date                              AS date,
  zip,
  climate_zone                                    AS zone,
  proposal_category                               AS category,
  proposal_title                                  AS title,
  proposal_content->>'product_suggestion'         AS product,
  (proposal_content->>'estimated_cost_usd')::int  AS cost_usd,
  COALESCE(outcome, 'bounced')                    AS outcome
FROM proposal_telemetry
ORDER BY generated_at DESC
LIMIT 10;
