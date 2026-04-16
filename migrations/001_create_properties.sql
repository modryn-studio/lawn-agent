-- Migration 001: properties table
-- Prerequisite for yard_properties and property_interactions.
-- Minimal spec per design doc — full schema (lot size, yard zones, HOA flags) is a later deliverable.

CREATE TABLE properties (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL REFERENCES neon_auth."user"(id),
  address     TEXT         NOT NULL,
  lat         NUMERIC(9,6) NULL,
  lng         NUMERIC(9,6) NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
