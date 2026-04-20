-- Migration 007: add zip to waitlist table
-- Stores the zip code entered on onboarding screen 1 alongside Pass captures.
-- NULL is valid — existing rows and any future source that doesn't supply a zip.
-- zip is the raw input; zone is always derivable from zip via phzmapi.org,
-- so we store zip only and derive zone at send time.

ALTER TABLE waitlist ADD COLUMN zip TEXT NULL;
