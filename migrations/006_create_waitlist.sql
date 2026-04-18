-- Migration 006: waitlist table
-- Captures email + optional country at the onboarding soft wall
-- (address validation failure point). country is populated from geocoding
-- API response; NULL is a valid value when the API returns nothing.
-- Upsert on email prevents duplicate submission errors.

CREATE TABLE waitlist (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT        NOT NULL UNIQUE,
  country     TEXT        NULL,
  source      TEXT        NOT NULL DEFAULT 'onboarding',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
