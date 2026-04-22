-- Lawn Agent — Full Funnel Snapshot
-- Run in Neon console whenever you want a health check.
-- "Proposal viewed" is NOT in the DB — use Vercel Analytics /onboarding pageviews for that stage.
-- Stage 6 (silent pass) is estimated: /onboarding pageviews - properties count - waitlist pass rows.

SELECT stage, count FROM (

  SELECT 1 AS ord, 'Completed onboarding (signed up)'     AS stage, COUNT(*)::int AS count
  FROM properties

  UNION ALL
  SELECT 2, 'Active proposals (pending)',                  COUNT(*)::int
  FROM proposals WHERE status = 'pending'

  UNION ALL
  SELECT 3, 'Completed actions (I did this)',              COUNT(*)::int
  FROM proposals WHERE status = 'done'

  UNION ALL
  SELECT 4, 'Product link taps (commerce_click)',          COUNT(*)::int
  FROM property_interactions WHERE interaction_type = 'commerce_click'

  UNION ALL
  SELECT 5, 'Passed — left email',                        COUNT(*)::int
  FROM waitlist WHERE source = 'pass'

  UNION ALL
  SELECT 6, 'Passed — silent (not in DB)',                 NULL::int

  UNION ALL
  SELECT 7, 'Non-US captured',                            COUNT(*)::int
  FROM waitlist WHERE source = 'non_us'

) t ORDER BY ord;
