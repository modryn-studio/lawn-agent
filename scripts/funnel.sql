-- Lawn Agent — Full Funnel Snapshot
-- Run in Neon console whenever you want a health check.
-- "Proposal viewed" is NOT in the DB — use Vercel Analytics /onboarding pageviews for that stage.
-- Stages 2-5 come from proposal_telemetry (anonymous, no user FK).
-- Stage 10 (silent pass) is estimated: /onboarding pageviews - properties count - waitlist pass rows.

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
