// Proposal validity layer: Zod schema + evaluator for proposal expiration conditions.
//
// Every proposal has implicit expiration conditions stored in validity_conditions JSONB.
// This module:
//   1. Defines the Zod schema for that JSONB structure (used for INSERT-time validation)
//   2. Exports evaluateProposalValidity(), which runs on dashboard load and returns
//      one of three states: 'valid', 'expiring_soon', or 'expired'
//
// v1 evaluators: soil_temp_threshold and calendar_date only.
// GDD and rainfall conditions are deferred — add a new case to the discriminated
// union and a new evaluator function below when the time comes.
//
// Design principle: this module is a pure evaluator. No DB access, no fetch calls,
// no logging. It accepts pre-fetched data and returns a state. Keep it that way.

import { z } from 'zod';
import type { WeatherContext } from '@/lib/weather';

// ── Warning thresholds ────────────────────────────────────────────────────────

// How many °F below a "direction: above" soil temp threshold triggers 'expiring_soon'.
const SOIL_TEMP_WARN_DELTA = 5;

// How many days before a calendar cutoff triggers 'expiring_soon'.
const CALENDAR_WARN_DAYS = 3;

// ── Condition schemas ─────────────────────────────────────────────────────────
// Flat schema — avoids z.discriminatedUnion which generates 'oneOf' in JSON
// schema and is rejected by Claude's generateObject. All type-specific fields
// are optional; evaluators degrade to 'valid' if a required field is missing.

const ConditionSchema = z.object({
  type: z.enum(['soil_temp_threshold', 'calendar_date']),
  // soil_temp_threshold fields
  metric: z.enum(['soil_temp_0cm', 'soil_temp_6cm']).optional(),
  threshold: z.number().optional(),
  // 'above': expires when reading >= threshold (e.g. crabgrass germination window)
  // 'below': expires when reading <= threshold (e.g. overseeding requires warmth)
  direction: z.enum(['above', 'below']).optional(),
  expires_when: z.literal('crossed').optional(),
  // calendar_date fields
  // ISO date string (YYYY-MM-DD). Proposal expires on this date (UTC midnight).
  expires_after: z
    .string()
    .refine((s) => !isNaN(Date.parse(s + 'T00:00:00Z')), {
      message: 'expires_after must be a valid date string (YYYY-MM-DD)',
    })
    .optional(),
});

// ── Top-level schema ──────────────────────────────────────────────────────────
// This is the shape Claude must output in validity_conditions.
// Validated on INSERT via parseValidityConditions() in proposals.ts.

export const ValidityConditionsSchema = z.object({
  conditions: z.array(ConditionSchema).min(1),
  // 'any': expired when ANY condition is met (most proposals — use this as the default)
  // 'all': expired when ALL conditions are met (rare: e.g. both date AND soil temp)
  logic: z.enum(['any', 'all']),
});

export type ValidityConditions = z.infer<typeof ValidityConditionsSchema>;
type ValidityCondition = z.infer<typeof ConditionSchema>;

// ── State types ───────────────────────────────────────────────────────────────

export type ValidityState = 'valid' | 'expiring_soon' | 'expired';

// Numeric weights for state reduction. Higher = worse.
const STATE_WEIGHT: Record<ValidityState, number> = {
  valid: 0,
  expiring_soon: 1,
  expired: 2,
};
const WEIGHT_TO_STATE: ValidityState[] = ['valid', 'expiring_soon', 'expired'];

// ── Condition evaluators ──────────────────────────────────────────────────────

function evaluateSoilTempThreshold(
  condition: ValidityCondition,
  weatherCtx: WeatherContext | null
): ValidityState {
  // Defensive guard — top-level function already short-circuits on null weatherCtx
  // when any soil_temp condition is present, but be explicit here.
  if (!weatherCtx) return 'valid';
  // Required fields missing means Claude output was malformed — degrade to valid.
  if (!condition.metric || condition.threshold == null || !condition.direction) return 'valid';

  const reading =
    condition.metric === 'soil_temp_0cm' ? weatherCtx.soilTemp0cm : weatherCtx.soilTemp6cm;

  // Null reading means Open-Meteo has no sensor data for this location.
  // Don't expire a proposal based on missing data.
  if (reading === null) return 'valid';

  if (condition.direction === 'above') {
    if (reading >= condition.threshold) return 'expired';
    if (reading >= condition.threshold - SOIL_TEMP_WARN_DELTA) return 'expiring_soon';
    return 'valid';
  } else {
    // direction === 'below': expires when temp drops to or below threshold
    if (reading <= condition.threshold) return 'expired';
    if (reading <= condition.threshold + SOIL_TEMP_WARN_DELTA) return 'expiring_soon';
    return 'valid';
  }
}

function evaluateCalendarDate(condition: ValidityCondition): ValidityState {
  if (!condition.expires_after) return 'valid';
  // Use UTC date strings throughout — avoids timezone boundary bugs where a user
  // in UTC-5 sees "expired" hours before the calendar date actually turns over.
  const todayStr = new Date().toISOString().slice(0, 10);
  const expiresMs = Date.parse(condition.expires_after + 'T00:00:00Z');
  const todayMs = Date.parse(todayStr + 'T00:00:00Z');
  const daysUntil = (expiresMs - todayMs) / (1000 * 60 * 60 * 24);

  if (daysUntil <= 0) return 'expired';
  if (daysUntil <= CALENDAR_WARN_DAYS) return 'expiring_soon';
  return 'valid';
}

function evaluateSingleCondition(
  condition: ValidityCondition,
  weatherCtx: WeatherContext | null
): ValidityState {
  switch (condition.type) {
    case 'soil_temp_threshold':
      return evaluateSoilTempThreshold(condition, weatherCtx);
    case 'calendar_date':
      return evaluateCalendarDate(condition);
  }
}

function reduceStates(states: ValidityState[], logic: 'any' | 'all'): ValidityState {
  const weights = states.map((s) => STATE_WEIGHT[s]);
  // 'any': expires when any condition is met → worst state wins (max weight)
  // 'all': expires when all conditions are met → best state wins (min weight)
  const reduced = logic === 'any' ? Math.max(...weights) : Math.min(...weights);
  return WEIGHT_TO_STATE[reduced];
}

// ── Public evaluator ──────────────────────────────────────────────────────────

/**
 * Evaluates a proposal's validity conditions against current data.
 *
 * Returns:
 *   'valid'         — proposal is still actionable
 *   'expiring_soon' — window is closing, user should act now
 *   'expired'       — window has closed, proposal is stale
 *
 * Graceful degradation:
 *   - null/undefined validityConditions → 'valid' (pre-instrumentation proposals)
 *   - schema parse failure → 'valid' (malformed Claude output, don't expire silently)
 *   - null weatherCtx + weather-dependent condition → 'valid' (weather unavailable)
 */
export function evaluateProposalValidity(
  validityConditions: unknown,
  weatherCtx: WeatherContext | null
): ValidityState {
  if (validityConditions == null) return 'valid';

  const parsed = ValidityConditionsSchema.safeParse(validityConditions);
  if (!parsed.success) return 'valid';

  const { conditions, logic } = parsed.data;

  // If any condition needs live weather data and we don't have it, we cannot
  // evaluate safely — degrade to 'valid' rather than incorrectly expiring.
  const requiresWeather = conditions.some((c) => c.type === 'soil_temp_threshold');
  if (requiresWeather && weatherCtx === null) return 'valid';

  const states = conditions.map((c) => evaluateSingleCondition(c, weatherCtx));
  return reduceStates(states, logic);
}
