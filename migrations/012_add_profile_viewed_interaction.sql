-- Migration 012: Add 'profile_viewed' to property_interactions allowed types
-- Tracks when a signed-up user sees the profile reveal screen in onboarding.
-- Fires fire-and-forget from profile-screen.tsx on mount.
-- Tells us how many users reach the end of the onboarding flow vs. drop after signup.

ALTER TABLE property_interactions
  DROP CONSTRAINT valid_interaction_type,
  ADD CONSTRAINT valid_interaction_type CHECK (interaction_type IN (
    'confirm', 'correct', 'log', 'dismiss', 'complete', 'skip', 'commerce_click', 'profile_viewed'
  ));
