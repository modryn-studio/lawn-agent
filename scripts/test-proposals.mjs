/**
 * E2E smoke test for the proposals generation pipeline.
 *
 * Tests:
 *   1. DB: creates a test property with yard_properties rows
 *   2. AI:  calls claude-sonnet-4-6 via generateObject with the context snapshot
 *   3. DB: inserts the returned proposal and reads it back
 *   4. DB: cleans up all test rows
 *
 * Run from workspace root:
 *   node --env-file=.env.local scripts/test-proposals.mjs
 */

import { neon } from '@neondatabase/serverless';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const sql = neon(process.env.DATABASE_URL);
const anthropicClient = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Proposal schema (mirror of route) ────────────────────────────────────────
const proposalSchema = z.object({
  title: z.string(),
  summary: z.string(),
  rationale: z.string(),
  category: z.enum([
    'fertilization',
    'weed_control',
    'overseeding',
    'aeration',
    'watering',
    'pest_control',
    'soil_amendment',
    'mowing',
    'other',
  ]),
  priority: z.enum(['high', 'medium', 'low']),
  timing: z.string(),
  product_suggestion: z.string().nullable(),
  estimated_cost_usd: z.number().nullable(),
  attribute_keys_affected: z.array(z.string()),
});

const SYSTEM_PROMPT = `You are a practical lawn care advisor. Your job is to produce one single, actionable proposal for a homeowner based on their yard data.

Rules:
- Propose only one action. The most impactful one given the current data.
- Write for someone who is not a lawn expert. Plain language only.
- Never use: "powerful", "seamless", "revolutionary", "AI-powered", "next-level", "smart", "intelligent".
- Be honest about what you don't know. If data is low-confidence, say so in the rationale.
- "Yard" = whole property (emotional). "Lawn" = grass specifically (actionable). Do not collapse.`;

// ── Hardcoded test context (no real user needed) ──────────────────────────────
const TEST_YARD_CONTEXT = `YARD CONTEXT — test-property — ${new Date().toISOString()}
Data maturity: partial (4 confirmed / 7 total)

CONFIRMED (high confidence — treat as facts):
- grass_type: tall_fescue (confirmed by user, 2 interactions)
- climate_zone: 7b (inferred from USDA API)
- yard_size_sqft: 2400 (confirmed by user, 1 interaction)
- last_treatment_date: 2025-10-01 (confirmed by user, 1 interaction)

LIKELY (medium confidence — use with hedging language):
- soil_type: clay-loam (inferred from regional data, likely for this address)
- sun_exposure: partial_shade (inferred from satellite)

ASSUMED (low confidence — flag uncertainty to user):
- slope: minimal (assumed from regional average, not verified)
`;

// ── Step 1: Seed test data ────────────────────────────────────────────────────
async function seedTestData(testUserId, testPropertyId) {
  console.log('\n[1/4] Seeding test data...');

  // Insert into neon_auth."user" — need a real-looking row for the FK
  // Columns use camelCase: "createdAt", "updatedAt", "emailVerified"
  await sql`
    INSERT INTO neon_auth."user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
    VALUES (${testUserId}, ${'Test User'}, ${'test+proposals@lawnagent.app'}, false, now(), now())
    ON CONFLICT (id) DO NOTHING
  `;

  await sql`
    INSERT INTO properties (id, user_id, address, created_at)
    VALUES (${testPropertyId}, ${testUserId}, '123 Test Lane, Richmond VA 23220', now())
  `;

  const attrs = [
    {
      key: 'grass_type',
      value: 'tall_fescue',
      unit: null,
      source: 'user_confirmed',
      score: 0.9,
      label: 'confirmed',
    },
    {
      key: 'climate_zone',
      value: '7b',
      unit: null,
      source: 'usda_api',
      score: 0.85,
      label: 'inferred',
    },
    {
      key: 'yard_size_sqft',
      value: '2400',
      unit: 'sqft',
      source: 'user_confirmed',
      score: 0.9,
      label: 'confirmed',
    },
    {
      key: 'last_treatment_date',
      value: '2025-10-01',
      unit: null,
      source: 'user_confirmed',
      score: 0.9,
      label: 'confirmed',
    },
    {
      key: 'soil_type',
      value: 'clay-loam',
      unit: null,
      source: 'regional_inference',
      score: 0.6,
      label: 'assumed',
    },
    {
      key: 'sun_exposure',
      value: 'partial_shade',
      unit: null,
      source: 'satellite_analysis',
      score: 0.7,
      label: 'inferred',
    },
    {
      key: 'slope',
      value: 'minimal',
      unit: null,
      source: 'regional_inference',
      score: 0.45,
      label: 'assumed',
    },
  ];

  for (const a of attrs) {
    await sql`
      INSERT INTO yard_properties
        (property_id, attribute_key, attribute_value, value_unit, version, is_current,
         source, confidence_score, confidence_label, is_locked, created_by)
      VALUES
        (${testPropertyId}, ${a.key}, ${a.value}, ${a.unit}, 1, true,
         ${a.source}, ${a.score}, ${a.label}, false, 'test-script')
    `;
  }

  console.log('   ✓ test user, property, and 7 yard_properties inserted');
}

// ── Step 2: Call Anthropic ────────────────────────────────────────────────────
async function callAnthropic() {
  console.log('\n[2/4] Calling claude-sonnet-4-6...');
  const start = Date.now();

  const { object } = await generateObject({
    model: anthropicClient('claude-sonnet-4-6'),
    schema: proposalSchema,
    system: SYSTEM_PROMPT,
    prompt: TEST_YARD_CONTEXT,
  });

  const elapsed = Date.now() - start;
  console.log(`   ✓ Response in ${elapsed}ms`);
  console.log(`   title:    ${object.title}`);
  console.log(`   category: ${object.category}`);
  console.log(`   priority: ${object.priority}`);
  console.log(`   timing:   ${object.timing}`);
  console.log(`   product:  ${object.product_suggestion ?? 'none'}`);
  console.log(`   summary:  ${object.summary}`);
  return object;
}

// ── Step 3: Insert proposal and read back ─────────────────────────────────────
async function insertAndVerify(testPropertyId, proposalContent) {
  console.log('\n[3/4] Inserting proposal into DB...');

  const [proposal] = await sql`
    INSERT INTO proposals (property_id, status, title, content)
    VALUES (${testPropertyId}, 'pending', ${proposalContent.title}, ${JSON.stringify(proposalContent)})
    RETURNING id, status, title, created_at
  `;

  const [readBack] = await sql`
    SELECT id, title, status, content->>'category' AS category
    FROM proposals WHERE id = ${proposal.id}
  `;

  console.log(`   ✓ Inserted: ${readBack.id}`);
  console.log(`   title:    ${readBack.title}`);
  console.log(`   category: ${readBack.category}`);
  console.log(`   status:   ${readBack.status}`);

  return proposal.id;
}

// ── Step 4: Cleanup ───────────────────────────────────────────────────────────
async function cleanup(testUserId, testPropertyId) {
  console.log('\n[4/4] Cleaning up test rows...');

  // Cascade handles yard_properties, property_interactions, proposals
  await sql`DELETE FROM properties WHERE id = ${testPropertyId}`;
  await sql`DELETE FROM neon_auth."user" WHERE id = ${testUserId}`;

  console.log('   ✓ Cleaned up');
}

// ── Runner ────────────────────────────────────────────────────────────────────
const testUserId = randomUUID();
const testPropertyId = randomUUID();

console.log('Lawn Agent — Proposals route smoke test');
console.log(`Test user:     ${testUserId}`);
console.log(`Test property: ${testPropertyId}`);

try {
  await seedTestData(testUserId, testPropertyId);
  const proposalContent = await callAnthropic();
  await insertAndVerify(testPropertyId, proposalContent);
  await cleanup(testUserId, testPropertyId);

  console.log('\n✅ All steps passed\n');
  process.exit(0);
} catch (err) {
  console.error('\n❌ Test failed:', err.message ?? err);
  // Best-effort cleanup
  try {
    await cleanup(testUserId, testPropertyId);
  } catch {}
  process.exit(1);
}
