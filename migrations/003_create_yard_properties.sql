-- Migration 003: yard_properties table
-- One row per property-attribute-version. Current value = row with is_current=true.
-- Full design per design-versioned-yardproperties-schema-interactions.md

CREATE TABLE yard_properties (
  -- Identity
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id       UUID          NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  -- What we're storing
  attribute_key     TEXT          NOT NULL,
  -- Enumerated values: 'grass_type', 'soil_type', 'sun_exposure',
  -- 'yard_size_sqft', 'climate_zone', 'usda_hardiness_zone',
  -- 'last_treatment_type', 'last_treatment_date', 'irrigation_type',
  -- 'slope', 'shade_coverage_pct'

  attribute_value   TEXT          NOT NULL,
  -- Stored as TEXT; typed at read time by application layer.

  value_unit        TEXT          NULL,
  -- 'sqft', 'pct', 'fahrenheit', etc. NULL if unitless.

  -- Versioning
  version           INTEGER       NOT NULL DEFAULT 1,
  is_current        BOOLEAN       NOT NULL DEFAULT true,

  -- Provenance
  source            TEXT          NOT NULL,

  -- Confidence
  confidence_score  NUMERIC(3,2)  NOT NULL,
  confidence_label  TEXT          NOT NULL,

  is_locked         BOOLEAN       NOT NULL DEFAULT false,

  -- Metadata
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_by        TEXT          NOT NULL DEFAULT 'system',

  -- Constraints
  CONSTRAINT confidence_range CHECK (confidence_score BETWEEN 0.00 AND 1.00),
  CONSTRAINT valid_source CHECK (source IN (
    'regional_inference', 'satellite_analysis', 'usda_api',
    'user_confirmed', 'user_corrected', 'user_logged',
    'proposal_feedback_implicit'
  )),
  CONSTRAINT valid_confidence_label CHECK (confidence_label IN (
    'assumed', 'inferred', 'confirmed', 'corrected'
  ))
);

-- Enforces one current row per attribute per property. Most important index in the schema.
CREATE UNIQUE INDEX idx_yard_properties_current
  ON yard_properties (property_id, attribute_key)
  WHERE is_current = true;

-- Full version history reads for the audit/accuracy narrative.
CREATE INDEX idx_yard_properties_property_history
  ON yard_properties (property_id, attribute_key, version DESC);

-- Feeds confidence-filtered queries in the context injection layer.
CREATE INDEX idx_yard_properties_confidence
  ON yard_properties (property_id, confidence_score)
  WHERE is_current = true;
