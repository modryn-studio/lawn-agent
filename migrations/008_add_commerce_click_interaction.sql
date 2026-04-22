-- Migration 008: Add 'commerce_click' to property_interactions allowed types
-- Tracks when a user taps the product suggestion link on a proposal card.
-- Fires as fire-and-forget from dashboard-proposal-card.tsx on product link click.
-- No email/PII captured — just property_id + proposal_id + timestamp.

ALTER TABLE property_interactions
  DROP CONSTRAINT valid_interaction_type,
  ADD CONSTRAINT valid_interaction_type CHECK (interaction_type IN (
    'confirm', 'correct', 'log', 'dismiss', 'complete', 'skip', 'commerce_click'
  ));
