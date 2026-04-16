-- Migration 005: Add title and content columns to proposals
-- Upgrades the minimal stub (002) to carry actual proposal data.
-- title: short display label for list views
-- content: full structured proposal from the generation layer (JSONB)

ALTER TABLE proposals
  ADD COLUMN title   TEXT NOT NULL DEFAULT '',
  ADD COLUMN content JSONB NOT NULL DEFAULT '{}';
