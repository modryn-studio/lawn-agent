# Yard Properties Schema & Query Layer Contract

**Deliverable: Technical Architecture**
**Author: Michelle Lim, Head of Engineering**
**Triggered by: Week 1 milestone — schema is the foundation; nothing else ships until this is right**

---

## Assessment Before Designing

Three things I need to name before the schema, because they'll shape the field decisions:

**1. This schema has two jobs that pull in different directions.** It stores data (simple) and it feeds the AI context injection stack (not simple). A storage schema optimized for reads is different from one optimized for prompt construction. I'm designing for both simultaneously — that's the constraint that determines every structural choice below.

**2. Versioning strategy choice: row-per-version vs. JSONB history column.** Row-per-version is auditable, queryable, and debuggable. JSONB history is compact but opaque — you can't easily query "how many users confirmed grass type in week one." We need the audit trail for the accuracy-over-time narrative. Row-per-version it is. I'm naming this as a deliberate choice because it adds table complexity in exchange for queryability.

**3. The confidence weighting logic has to be deterministic and visible.** This isn't ML — it's rules-based. The prompt gets a confidence-weighted snapshot; that means we need to be able to explain exactly why a value has confidence 0.6 vs. 0.9. Opaque scoring will kill debugging. Named rules, not float arithmetic from nowhere.

---

## Schema

### Table 1: `yard_properties`

One row per property-attribute-version. The current value for a given attribute is the row with the highest `version` for that `property_id` + `attribute_key`.

```sql
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
  -- Enum values stored as string ('cool_season', 'warm_season', 'transition').
  -- Numerics stored as string ('2400'). 
  -- Rationale: schema stability as attribute set expands.
  
  value_unit        TEXT          NULL,
  -- 'sqft', 'pct', 'fahrenheit', etc. NULL if unitless.
  
  -- Versioning
  version           INTEGER       NOT NULL DEFAULT 1,
  is_current        BOOLEAN       NOT NULL DEFAULT true,
  -- Denormalized for fast "give me current state" reads.
  -- Maintained by application layer on write.
  -- Alternative considered: view + MAX(version) — rejected; adds query complexity
  -- on hot path for negligible write savings.
  
  -- Provenance
  source            TEXT          NOT NULL,
  -- Enumerated: 'regional_inference', 'satellite_analysis', 
  -- 'usda_api', 'user_confirmed', 'user_corrected', 'user_logged',
  -- 'proposal_feedback_implicit'
  
  -- Confidence
  confidence_score  NUMERIC(3,2)  NOT NULL,
  -- Range: 0.00–1.00. Computed at write time by application layer
  -- using the confidence rules defined below. Stored, not computed on read.
  -- Rationale: computed-on-read is cheaper at write but creates
  -- divergence risk if rule logic changes. Stored score = auditable snapshot.
  
  confidence_label  TEXT          NOT NULL,
  -- Enumerated: 'assumed', 'inferred', 'confirmed', 'corrected'
  -- Human-readable for prompt injection and UI rendering.
  -- Derived from source + interaction history, not from score alone.
  
  is_locked         BOOLEAN       NOT NULL DEFAULT false,
  -- TRUE for attributes that must not be assumed — e.g., lime recommendations.
  -- These are never included in proposals as 'assumed'; they surface as
  -- 'recommended action: get soil test' instead.
  -- Current locked attributes: 'soil_ph', 'nutrient_deficiency'
  
  -- Metadata
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  created_by        TEXT          NOT NULL DEFAULT 'system',
  -- 'system' | 'user:{user_id}' | 'agent:{agent_version}'
  
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

-- Indexes
CREATE UNIQUE INDEX idx_yard_properties_current 
  ON yard_properties (property_id, attribute_key) 
  WHERE is_current = true;
-- Enforces one current row per attribute per property.
-- This is the most important index in the schema.

CREATE INDEX idx_yard_properties_property_history 
  ON yard_properties (property_id, attribute_key, version DESC);
-- Full version history reads for the audit/accuracy narrative.

CREATE INDEX idx_yard_properties_confidence 
  ON yard_properties (property_id, confidence_score) 
  WHERE is_current = true;
-- Feeds confidence-filtered queries in the context injection layer.
```

---

### Table 2: `property_interactions`

Every user action that touches a yard property — confirm, correct, log — captured with full context for the accuracy model.

```sql
CREATE TABLE property_interactions (
  -- Identity
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id         UUID          NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id             UUID          NOT NULL REFERENCES users(id),
  
  -- What happened
  interaction_type    TEXT          NOT NULL,
  -- Enumerated: 
  --   'confirm'   — user validated an assumed/inferred value as correct
  --   'correct'   — user changed an assumed/inferred value to something else
  --   'log'       — user reported an action they took (applied fertilizer, etc.)
  --   'dismiss'   — user dismissed a proposal without acting (implicit signal)
  --   'complete'  — user marked a recommended action as done
  --   'skip'      — user skipped a recommendation (too expensive, wrong season, etc.)
  
  attribute_key       TEXT          NULL,
  -- NULL for interaction_types that don't target a specific attribute
  -- ('dismiss', 'complete', 'skip' on proposals are proposal-level, not attribute-level).
  
  -- Values (before/after for mutations)
  previous_value      TEXT          NULL,
  -- The value of the attribute before this interaction.
  -- NULL on 'confirm' (value unchanged), 'log', 'dismiss'.
  
  new_value           TEXT          NULL,
  -- The value after the interaction.
  -- NULL on 'dismiss'.
  -- On 'confirm': matches previous_value (logged for audit).
  -- On 'correct': the user's replacement value.
  -- On 'log': the reported action ('applied_fertilizer', 'overseeded', etc.).
  
  -- Context at interaction time
  source_version_id   UUID          NULL REFERENCES yard_properties(id),
  -- Points to the yard_properties row that existed when this interaction occurred.
  -- Allows reconstruction of "what did the model think when the user confirmed this?"
  
  proposal_id         UUID          NULL REFERENCES proposals(id),
  -- If this interaction came from a proposal card, which proposal.
  -- NULL if triggered from profile/onboarding outside a proposal.
  
  -- Signal strength for confidence recalculation
  interaction_context TEXT          NOT NULL DEFAULT 'direct',
  -- 'direct'   — user explicitly interacted with an attribute field
  -- 'proposal' — interaction came from a proposal card accept/edit
  -- 'onboarding' — interaction came from onboarding flow
  -- 'implicit' — system-inferred from behavior (e.g., repeated dismissals)
  
  -- Metadata
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  session_id          TEXT          NULL,
  -- Optional: for grouping interactions within a single session.
  -- Not required at launch; add if session analysis becomes necessary.
  
  CONSTRAINT valid_interaction_type CHECK (interaction_type IN (
    'confirm', 'correct', 'log', 'dismiss', 'complete', 'skip'
  )),
  CONSTRAINT valid_interaction_context CHECK (interaction_context IN (
    'direct', 'proposal', 'onboarding', 'implicit'
  ))
);

-- Indexes
CREATE INDEX idx_property_interactions_property 
  ON property_interactions (property_id, created_at DESC);
-- Primary read: "give me recent interactions for this property"

CREATE INDEX idx_property_interactions_attribute 
  ON property_interactions (property_id, attribute_key, created_at DESC)
  WHERE attribute_key IS NOT NULL;
-- Attribute-specific history: "how many times has grass_type been confirmed?"

CREATE INDEX idx_property_interactions_user 
  ON property_interactions (user_id, created_at DESC);
-- User-level engagement audit.

CREATE INDEX idx_property_interactions_proposal 
  ON property_interactions (proposal_id)
  WHERE proposal_id IS NOT NULL;
-- Proposal outcome tracking.
```

---

### Supporting Reference: `properties` table (minimal definition for foreign keys)

I'm not designing the full `properties` table here — that's a separate deliverable. But the foreign key dependency requires that it exist with at minimum these columns before Week 1 schema migration runs:

```sql
-- Prerequisite: must exist before yard_properties migration
CREATE TABLE properties (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID    NOT NULL REFERENCES users(id),
  address     TEXT    NOT NULL,
  lat         NUMERIC(9,6) NULL,
  lng         NUMERIC(9,6) NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

This is a contract, not a full schema. Whoever builds `properties` in full needs to include these columns without renaming them.

---

## Confidence Weighting Logic

### Rules (Deterministic, Named)

Confidence is computed at write time by the application layer. Not ML. These are named rules that produce a float. The rule name is logged so we can audit "why did this attribute get 0.6."

```
CONFIDENCE RULES — applied in sequence, first match wins:

RULE: user_corrected
  Trigger: source = 'user_corrected'
  Score: 0.95
  Label: 'corrected'
  Rationale: User took the effort to actively change a value. Highest signal 
             outside a verified external data source. Not 1.0 because users 
             sometimes correct to wrong values too.

RULE: user_confirmed_direct
  Trigger: source = 'user_confirmed' AND interaction_context = 'direct'
  Score: 0.90
  Label: 'confirmed'
  Rationale: Explicit confirmation of a specific attribute in a direct interaction.

RULE: user_confirmed_proposal
  Trigger: source = 'user_confirmed' AND interaction_context = 'proposal'
  Score: 0.80
  Label: 'confirmed'
  Rationale: Implicit confirmation via accepting a proposal. Real signal, 
             but less explicit than direct attribute confirmation.

RULE: usda_api
  Trigger: source = 'usda_api'
  Score: 0.85
  Label: 'inferred'
  Rationale: External authoritative source, but for the region not the 
             specific property. Hardiness zone from USDA is highly reliable;
             soil type from USDA is regional approximation.

RULE: satellite_analysis
  Trigger: source = 'satellite_analysis'
  Score: 0.70
  Label: 'inferred'
  Rationale: Satellite data is real property-level signal, but grass type
             inference from imagery has meaningful error rate. Better than
             regional average, not as good as user confirmation.

RULE: regional_inference_transition_zone
  Trigger: source = 'regional_inference' AND attribute_key = 'grass_type' 
           AND inferred_zone_type = 'transition'
  Score: 0.45
  Label: 'assumed'
  Rationale: Transition zones are specifically uncertain. Per the product
             decision: cool vs. warm season inferred from address, with 
             confirmation tap in transition zones. This score triggers the 
             confirmation prompt in the UI.

RULE: regional_inference_standard
  Trigger: source = 'regional_inference'
  Score: 0.60
  Label: 'assumed'
  Rationale: Regional data is real signal but not property-specific.
             Reasonable default for non-transition zones.

RULE: proposal_feedback_implicit
  Trigger: source = 'proposal_feedback_implicit'
  Score: 0.55
  Label: 'assumed'
  Rationale: Behavior-derived inference. Meaningful but indirect.

RULE: fallback
  Trigger: no rule matched (should not occur in prod; log if it does)
  Score: 0.30
  Label: 'assumed'
  Rationale: Unknown provenance. Flag for review.
```

### Confidence Decay on Inactivity

Not implementing at launch. This is named debt: time-decay logic (confidence decreasing for attributes not reconfirmed after N months) will be needed for the accuracy-over-time narrative but adds clock-dependent query complexity. Adding it now would complicate the query layer for Week 1. Flagging it explicitly so it doesn't get forgotten:

**Named debt:** Confidence decay. Cost to add: approximately 2 days of engineering when triggered. Trigger: when the product team decides to surface "your yard data may be outdated" prompts, or when churn analysis shows users disengaging from stale proposals. Not needed at Week 4 with 10 users.

---

## Query Layer Contract

This is the contract between the schema and the context injection stack. The context injection stack pulls this on every proposal call. The contract defines exactly what gets sent to the Anthropic API.

### Context Snapshot Query

```sql
-- Name: get_property_context_snapshot
-- Called by: context injection layer, once per proposal generation
-- Returns: confidence-weighted current property state for a given property_id
-- SLA: must complete in <50ms; this is on the hot path for streaming proposals

SELECT 
  yp.attribute_key,
  yp.attribute_value,
  yp.value_unit,
  yp.confidence_score,
  yp.confidence_label,
  yp.source,
  yp.is_locked,
  yp.version,
  yp.created_at AS last_updated,
  
  -- Interaction counts for context quality signal
  COUNT(pi.id) FILTER (WHERE pi.interaction_type = 'confirm') AS confirm_count,
  COUNT(pi.id) FILTER (WHERE pi.interaction_type = 'correct') AS correct_count,
  MAX(pi.created_at) AS last_interaction_at

FROM yard_properties yp
LEFT JOIN property_interactions pi 
  ON pi.property_id = yp.property_id 
  AND pi.attribute_key = yp.attribute_key

WHERE yp.property_id = $1        -- bound parameter: property UUID
  AND yp.is_current = true

GROUP BY 
  yp.id, yp.attribute_key, yp.attribute_value, yp.value_unit,
  yp.confidence_score, yp.confidence_label, yp.source, 
  yp.is_locked, yp.version, yp.created_at

ORDER BY yp.attribute_key;
```

### Context Block Construction (Application Layer)

The application layer transforms query results into a structured block before injection. This is not done in SQL — it's done in TypeScript in the injection layer. The contract defines the output format:

```typescript
// Type: PropertyContextBlock
// This is what gets injected into the prompt, not the raw query result.

type ConfidenceLabel = 'assumed' | 'inferred' | 'confirmed' | 'corrected';

interface AttributeContext {
  key: string;
  value: string;
  unit: string | null;
  confidence: number;          // 0.00–1.00
  label: ConfidenceLabel;
  source: string;
  isLocked: boolean;
  interactionCount: number;    // total confirms + corrects; proxy for data maturity
}

interface PropertyContextBlock {
  propertyId: string;
  snapshotTimestamp: string;   // ISO 8601, UTC
  
  // Three tiers, separated at the application layer before injection
  highConfidence: AttributeContext[];    // confidence >= 0.80; inject as facts
  mediumConfidence: AttributeContext[];  // confidence 0.50–0.79; inject as "likely X"
  lowConfidence: AttributeContext[];     // confidence < 0.50; inject as "assumed X, unverified"
  lockedAttributes: AttributeContext[];  // is_locked = true; never inject as assumed;
                                         // surface as "requires [action] before recommendation"
  
  // Summary statistics for prompt header
  totalAttributes: number;
  confirmedCount: number;      // label = 'confirmed' or 'corrected'
  assumedCount: number;        // label = 'assumed'
  dataMaturity: 'new' | 'partial' | 'mature';
  // new: <3 confirmed attributes
  // partial: 3–6 confirmed attributes  
  // mature: >6 confirmed attributes
}
```

### Prompt Injection Format

The context block is serialized into the prompt in this exact format. Consistency matters: the model learns to parse this structure across calls. Changing the format requires updating the system prompt.

```
YARD CONTEXT — [property_id] — [snapshotTimestamp]
Data maturity: [dataMaturity] ([confirmedCount] confirmed / [totalAttributes] total)

CONFIRMED (high confidence — treat as facts):
- grass_type: tall_fescue (confirmed by user, 2 interactions)
- climate_zone: 7b (inferred from USDA API)
- yard_size_sqft: 2400 (confirmed by user, 1 interaction)

LIKELY (medium confidence — use with hedging language):
- soil_type: clay-loam (inferred from regional data, likely for this address)
- sun_exposure: partial_shade (inferred from satellite)

ASSUMED (low confidence — flag uncertainty to user):
- slope: minimal (assumed from regional average, not verified)

REQUIRES ACTION BEFORE RECOMMENDATION (locked — do not propose without):
- soil_ph: [not measured] — recommend soil test before proposing lime or pH amendments
```

### Context Injection Boundary Declaration

What goes to the Anthropic API on each proposal call:

| Included | Not Included |
|----------|-------------|
| Property context block (as above) | User's full address (only address hash or property_id) |
| Seasonal/climate data for the region | Other users' data |
| Current proposal request | Historical proposals (by default) |
| Member system prompt | Raw interaction logs |
| Confidence labels and maturity score | PII beyond what's in the property block |

**Boundary rule:** The property context block is constructed from the query result and anonymized at the application layer before injection. The raw query result (which may contain the full address) does not get sent directly to the API. The application layer is responsible for this transformation. This boundary needs to be enforced in code review, not just in documentation.

This boundary will need explicit review if: (a) the injection layer is modified to include additional context, (b) the `properties` table schema changes to add new PII fields, or (c) the proposal generation logic moves from server-side to client-side.

---

## Migration Order

This matters for Week 1 sequencing:

```
1. users table          (prerequisite; assumed to exist)
2. properties table     (prerequisite; minimal definition above)
3. yard_properties      (core schema — this deliverable)
4. property_interactions (depends on yard_properties for source_version_id FK)
5. proposals table      (depends on property_interactions for FK — separate deliverable)
```

Do not run migrations 3 and 4 in the same transaction. If `yard_properties` migration fails, `property_interactions` should not be partially created in a bad state. Run them sequentially with verification between.

---

## What's Not In This Schema

Naming explicitly so these don't become surprise gaps:

**`proposals` table** — not designed here; it's a separate deliverable. `property_interactions` has a FK to it, which means the proposals table needs to exist before `property_interactions` can have data with `proposal_id` populated. The FK is nullable, so this doesn't block the migration — but proposal-linked interactions won't be possible until proposals ships.

**Full `properties` table** — the Week 1 prerequisite only needs the fields listed. The full schema (lot size from parcel data, multiple yard zones, HOA flags, etc.) is a later deliverable.

**User preferences table** — the injection layer may eventually need communication preferences, notification settings, etc. Not in scope here.

**Soil test results as a first-class entity** — lime and pH are locked attributes in this schema. When we eventually support soil test uploads, that data needs its own table, not just a `user_logged` row in `yard_properties`. Named debt; not needed at 10 users.

---

## Summary

Three deliverables, two named debts, one migration order, one boundary declaration.

**The schema:** `yard_properties` (versioned rows, one current per attribute per property) + `property_interactions` (all user events with before/after state).

**The confidence system:** seven named rules, deterministic, stored at write time, auditable. Confidence decay is named debt for later.

**The query contract:** the injection layer pulls a confidence-weighted snapshot, stratified into three tiers, serialized in a fixed prompt format. PII filtering happens at the application layer, not in SQL.

**The one thing that needs immediate agreement:** the `properties` table prerequisite. Before any migration for Week 1 runs, I need confirmation that the `properties` table minimum spec (id, user_id, address, lat, lng) either already exists or will be created in the same migration sprint. If that's unclear, it's a blocker for the dependency chain, not just a gap.