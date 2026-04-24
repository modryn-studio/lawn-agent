-- Migration 011: Add proposal_rendered_at to proposal_telemetry
-- Records when the proposal screen rendered client-side (i.e. the user survived the loading state).
-- NULL = user never saw the proposal (bounced during loading, or pre-instrumentation baseline).
-- Delta between generated_at and proposal_rendered_at = loading state duration.

ALTER TABLE proposal_telemetry
  ADD COLUMN proposal_rendered_at TIMESTAMPTZ NULL;
