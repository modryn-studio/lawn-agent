-- Migration 010: Add proposal_content to proposal_telemetry
-- Stores the full Claude-generated proposal object for anonymous users.
-- Enables complete visibility into what was shown — including product, cost, rationale — even when the user never signs up.

ALTER TABLE proposal_telemetry
  ADD COLUMN proposal_content JSONB NULL;
