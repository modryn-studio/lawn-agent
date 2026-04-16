-- Migration 002: proposals stub
-- Minimal table to satisfy the nullable FK from property_interactions.proposal_id.
-- Full proposals schema (AI-generated content, commerce links, status machine) is a Week 3 deliverable.

CREATE TABLE proposals (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID         NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  status      TEXT         NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
