-- Migration 013: Add validity layer columns to proposals
--
-- A proposal has implicit expiration conditions (soil temp threshold, calendar
-- date, GDD accumulation, rainfall, related-proposal completion). The validity
-- layer stores those conditions at generation time and lets a downstream
-- evaluator decide whether the proposal is still valid, expiring soon, or
-- expired against current data.
--
-- Both columns are nullable. NULL validity_conditions = "always valid" — the
-- correct default for proposals generated before this migration. NULL
-- last_evaluated_at = "never evaluated" — the evaluator stamps this on every
-- run.
--
-- This migration is foundation only. The evaluator, Zod validation on INSERT,
-- and the system prompt change that populates validity_conditions land in
-- follow-up commits.

ALTER TABLE proposals
  ADD COLUMN validity_conditions JSONB,
  ADD COLUMN last_evaluated_at   TIMESTAMPTZ;
