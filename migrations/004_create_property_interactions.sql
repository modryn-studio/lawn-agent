-- Migration 004: property_interactions table
-- Every user action that touches a yard property, captured with full context.
-- Depends on yard_properties (source_version_id FK) and proposals (proposal_id nullable FK).
-- Full design per design-versioned-yardproperties-schema-interactions.md

CREATE TABLE property_interactions (
  -- Identity
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id         UUID          NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id             UUID          NOT NULL REFERENCES neon_auth."user"(id),

  -- What happened
  interaction_type    TEXT          NOT NULL,
  -- Enumerated: 'confirm', 'correct', 'log', 'dismiss', 'complete', 'skip'

  attribute_key       TEXT          NULL,
  -- NULL for proposal-level interaction_types (dismiss, complete, skip).

  -- Values (before/after for mutations)
  previous_value      TEXT          NULL,
  new_value           TEXT          NULL,

  -- Context at interaction time
  source_version_id   UUID          NULL REFERENCES yard_properties(id),
  -- Points to the yard_properties row that existed when this interaction occurred.

  proposal_id         UUID          NULL REFERENCES proposals(id),
  -- NULL if triggered outside a proposal card.

  -- Signal strength for confidence recalculation
  interaction_context TEXT          NOT NULL DEFAULT 'direct',

  -- Metadata
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  session_id          TEXT          NULL,

  CONSTRAINT valid_interaction_type CHECK (interaction_type IN (
    'confirm', 'correct', 'log', 'dismiss', 'complete', 'skip'
  )),
  CONSTRAINT valid_interaction_context CHECK (interaction_context IN (
    'direct', 'proposal', 'onboarding', 'implicit'
  ))
);

-- Primary read: recent interactions for a property.
CREATE INDEX idx_property_interactions_property
  ON property_interactions (property_id, created_at DESC);

-- Attribute-specific history: how many times has grass_type been confirmed?
CREATE INDEX idx_property_interactions_attribute
  ON property_interactions (property_id, attribute_key, created_at DESC)
  WHERE attribute_key IS NOT NULL;

-- User-level engagement audit.
CREATE INDEX idx_property_interactions_user
  ON property_interactions (user_id, created_at DESC);

-- Proposal outcome tracking.
CREATE INDEX idx_property_interactions_proposal
  ON property_interactions (proposal_id)
  WHERE proposal_id IS NOT NULL;
