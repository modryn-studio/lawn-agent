-- Migration 009: Create proposal_telemetry table
-- Logs every unauthenticated onboarding proposal. No PII, no FK to any user record.
-- outcome: 'approved' | 'passed' | NULL (null = bounced before action was captured)

CREATE TABLE proposal_telemetry (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  zip               TEXT        NOT NULL,
  climate_zone      TEXT        NULL,
  proposal_category TEXT        NOT NULL,
  proposal_title    TEXT        NOT NULL,
  generated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  outcome           TEXT        NULL  -- 'approved', 'passed', null if bounced
);
