import { z } from 'zod';
import { generateObject } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { sql } from '@/lib/db';
import { env } from '@/lib/env';
import { reverseGeocode } from '@/lib/geocode';
import { createRouteLogger } from '@/lib/route-logger';

// ── Proposal output schema ────────────────────────────────────────────────────
// Defines what claude-sonnet-4-6 must return. Stored verbatim in proposals.content.
export const proposalSchema = z.object({
  title: z.string().describe('Short action-oriented title (5–8 words)'),
  summary: z
    .string()
    .describe('1–2 sentence description of what to do and why, written for a non-expert homeowner'),
  rationale: z
    .string()
    .describe('Why this is the right action for this yard right now, given the data'),
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
  timing: z
    .string()
    .describe('When to take this action, e.g. "Within the next 2 weeks" or "This fall"'),
  product_suggestion: z
    .string()
    .nullable()
    .describe('Specific product name if applicable, null if no product needed'),
  estimated_cost_usd: z
    .number()
    .nullable()
    .describe('Rough cost estimate in USD, null if not applicable'),
  attribute_keys_affected: z
    .array(z.string())
    .describe('Yard attribute keys this proposal directly addresses'),
  attribute_context: z
    .object({
      hardiness_zone: z.string().optional(),
      grass_type: z.string().optional(),
      soil_type: z.string().optional(),
    })
    .optional()
    .describe('Contextual sublabel copy for each displayed yard attribute'),
});

export type ProposalContent = z.infer<typeof proposalSchema>;

// ── Context block types (from design doc) ────────────────────────────────────
export interface AttributeContext {
  key: string;
  value: string;
  unit: string | null;
  confidence: number;
  label: string;
  source: string;
  isLocked: boolean;
  interactionCount: number;
}

type DataMaturity = 'new' | 'partial' | 'mature';

export interface ContextBlock {
  highConfidence: AttributeContext[];
  mediumConfidence: AttributeContext[];
  lowConfidence: AttributeContext[];
  lockedAttributes: AttributeContext[];
  totalAttributes: number;
  confirmedCount: number;
  dataMaturity: DataMaturity;
}

export function buildContextBlock(rows: Record<string, unknown>[]): ContextBlock {
  const allAttrs: AttributeContext[] = rows.map((r) => ({
    key: r.attribute_key as string,
    value: r.attribute_value as string,
    unit: (r.value_unit as string | null) ?? null,
    confidence: parseFloat(r.confidence_score as string),
    label: r.confidence_label as string,
    source: r.source as string,
    isLocked: r.is_locked as boolean,
    interactionCount:
      (parseInt(r.confirm_count as string, 10) || 0) +
      (parseInt(r.correct_count as string, 10) || 0),
  }));

  const locked = allAttrs.filter((a) => a.isLocked);
  const unlocked = allAttrs.filter((a) => !a.isLocked);

  const confirmedCount = allAttrs.filter(
    (a) => a.label === 'confirmed' || a.label === 'corrected'
  ).length;

  let dataMaturity: DataMaturity = 'new';
  if (confirmedCount > 6) dataMaturity = 'mature';
  else if (confirmedCount >= 3) dataMaturity = 'partial';

  return {
    highConfidence: unlocked.filter((a) => a.confidence >= 0.8),
    mediumConfidence: unlocked.filter((a) => a.confidence >= 0.5 && a.confidence < 0.8),
    lowConfidence: unlocked.filter((a) => a.confidence < 0.5),
    lockedAttributes: locked,
    totalAttributes: allAttrs.length,
    confirmedCount,
    dataMaturity,
  };
}

/**
 * Also accepts AttributeContext[] directly for onboarding flow where
 * attributes come from inference rather than DB rows.
 */
export function buildContextBlockFromAttributes(attrs: AttributeContext[]): ContextBlock {
  const locked = attrs.filter((a) => a.isLocked);
  const unlocked = attrs.filter((a) => !a.isLocked);

  const confirmedCount = attrs.filter(
    (a) => a.label === 'confirmed' || a.label === 'corrected'
  ).length;

  let dataMaturity: DataMaturity = 'new';
  if (confirmedCount > 6) dataMaturity = 'mature';
  else if (confirmedCount >= 3) dataMaturity = 'partial';

  return {
    highConfidence: unlocked.filter((a) => a.confidence >= 0.8),
    mediumConfidence: unlocked.filter((a) => a.confidence >= 0.5 && a.confidence < 0.8),
    lowConfidence: unlocked.filter((a) => a.confidence < 0.5),
    lockedAttributes: locked,
    totalAttributes: attrs.length,
    confirmedCount,
    dataMaturity,
  };
}

// Serialize context block into the exact prompt format from the design doc.
// Consistency here matters: changing this format requires updating the system prompt.
export function serializeContextBlock(propertyId: string, block: ContextBlock): string {
  const ts = new Date().toISOString();
  const lines: string[] = [
    `YARD CONTEXT — ${propertyId} — ${ts}`,
    `Data maturity: ${block.dataMaturity} (${block.confirmedCount} confirmed / ${block.totalAttributes} total)`,
    '',
  ];

  if (block.highConfidence.length > 0) {
    lines.push('CONFIRMED (high confidence — treat as facts):');
    for (const a of block.highConfidence) {
      const unit = a.unit ? ` ${a.unit}` : '';
      const interactions =
        a.interactionCount > 0
          ? `, ${a.interactionCount} interaction${a.interactionCount !== 1 ? 's' : ''}`
          : '';
      lines.push(`- ${a.key}: ${a.value}${unit} (${a.label}${interactions})`);
    }
    lines.push('');
  }

  if (block.mediumConfidence.length > 0) {
    lines.push('LIKELY (medium confidence — use with hedging language):');
    for (const a of block.mediumConfidence) {
      const unit = a.unit ? ` ${a.unit}` : '';
      lines.push(`- ${a.key}: ${a.value}${unit} (${a.label} from ${a.source})`);
    }
    lines.push('');
  }

  if (block.lowConfidence.length > 0) {
    lines.push('ASSUMED (low confidence — flag uncertainty to user):');
    for (const a of block.lowConfidence) {
      const unit = a.unit ? ` ${a.unit}` : '';
      lines.push(`- ${a.key}: ${a.value}${unit} (assumed from ${a.source}, not verified)`);
    }
    lines.push('');
  }

  if (block.lockedAttributes.length > 0) {
    lines.push(
      'LOCKED (do not use as basis for primary recommendation — may inform secondary note only):'
    );
    for (const a of block.lockedAttributes) {
      const valueDisplay = a.value || '[not measured]';
      lines.push(
        `- ${a.key}: ${valueDisplay} — recommend appropriate test or measurement before proposing`
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}

export const SYSTEM_PROMPT = `You are a lawn care advisor for a specific homeowner in a specific place at a specific moment in time. Your job is to produce one proposal — the single most impactful action they should take on their lawn this week.

Today's date is {CURRENT_DATE}. Use it. The proposal must be anchored to what is actually happening in this yard right now — not general advice, not evergreen recommendations. If it could have been written in any month of the year, it is wrong.

Reasoning sequence (follow this before writing):
1. What is the current season and growth stage for this grass type in this zone right now?
2. What treatment windows are open, closing, or about to open in the next 2 weeks?
3. Given those windows, what is the single highest-impact action this week?
4. Does anything in the yard data contradict or block that action?

Rules:
- Propose only one action. The most impactful one for this zone, this grass type, this week.
- The rationale must name the zone, the grass type, and the specific timing reason. If it could apply to any yard anywhere, rewrite it.
- Write for someone who is not a lawn expert. Plain language only.
- "Yard" = whole property (emotional). "Lawn" = grass specifically (actionable). Do not collapse. This distinction applies everywhere — never use yard when you mean grass, never use lawn when you mean the whole property.
- Never use: "powerful", "seamless", "revolutionary", "AI-powered", "next-level", "smart", "intelligent".
- Do not hallucinate product names. If you are not confident in a specific product, set product_suggestion to null.
- If soil_ph is locked and the primary recommendation is pH-sensitive, close the rationale with one sentence explaining why a soil test would sharpen this specific recommendation. Only when the connection is real. Never as a default closer.

Attribute context:
Write each attribute_context sublabel as a single sentence that is true for this zone and accurate for the current season. Use the LOCATION field if present for the soil_type sentence.`;

// Accept an optional pre-computed date string so callers can log the exact value
// that gets injected into the prompt — prevents a theoretical mismatch if the
// request straddles midnight between the log call and this call.
export function buildSystemPrompt(date?: string): string {
  const currentDate =
    date ??
    new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  return SYSTEM_PROMPT.replace('{CURRENT_DATE}', currentDate);
}

// ── Authenticated proposal generation ─────────────────────────────────────────
// Generates and saves a new pending proposal for a known property.
// Called from /api/proposals (manual) and /api/proposals/[id]/complete (auto, via after()).
//
// Returns the inserted DB row on success.
// Returns null for graceful skips: pending proposal already exists, or no yard data.
// Throws on unexpected errors — callers decide to surface or swallow.
export async function generateAndSaveProposalForProperty(
  propertyId: string
): Promise<Record<string, unknown> | null> {
  const log = createRouteLogger('proposal-gen');
  const ctx = log.begin();

  try {
    // Pending guard — do not create a duplicate if one is already waiting for action.
    // Uses status = 'pending' specifically; a 'done' proposal is the trigger, not a blocker.
    const [{ count }] = await sql`
      SELECT COUNT(*)::int AS count
      FROM proposals
      WHERE property_id = ${propertyId}
        AND status = 'pending'
    `;
    if ((count as number) > 0) {
      log.info(ctx.reqId, 'Skipped — pending proposal exists', { propertyId });
      return null;
    }

    // Fetch property coordinates for optional reverse geocoding
    const [property] = await sql`
      SELECT lat, lng FROM properties WHERE id = ${propertyId}
    `;
    if (!property) {
      log.warn(ctx.reqId, 'Property not found', { propertyId });
      return null;
    }

    // Yard context + geocode in parallel — geocode is non-fatal
    const [rows, geoLocation] = await Promise.all([
      sql`
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
          COUNT(pi.id) FILTER (WHERE pi.interaction_type = 'confirm') AS confirm_count,
          COUNT(pi.id) FILTER (WHERE pi.interaction_type = 'correct') AS correct_count,
          MAX(pi.created_at) AS last_interaction_at
        FROM yard_properties yp
        LEFT JOIN property_interactions pi
          ON pi.property_id = yp.property_id
          AND pi.attribute_key = yp.attribute_key
        WHERE yp.property_id = ${propertyId}
          AND yp.is_current = true
        GROUP BY
          yp.id, yp.attribute_key, yp.attribute_value, yp.value_unit,
          yp.confidence_score, yp.confidence_label, yp.source,
          yp.is_locked, yp.version, yp.created_at
        ORDER BY yp.attribute_key
      `,
      property.lat && property.lng
        ? reverseGeocode(property.lat as string, property.lng as string).catch(() => null)
        : Promise.resolve(null),
    ]);

    if (rows.length === 0) {
      log.warn(ctx.reqId, 'Skipped — no yard data', { propertyId });
      return null;
    }

    const contextBlock = buildContextBlock(rows as Record<string, unknown>[]);
    const yardContext = serializeContextBlock(propertyId, contextBlock);
    const locationBlock = geoLocation ? `LOCATION: ${geoLocation.city}, ${geoLocation.state}` : '';
    const finalPrompt = [locationBlock, yardContext].filter(Boolean).join('\n');

    const systemDate = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    log.info(ctx.reqId, 'Calling Claude', {
      propertyId,
      model: 'claude-sonnet-4-6',
      systemDate,
      promptChars: finalPrompt.length,
      maturity: contextBlock.dataMaturity,
      hasLocation: !!geoLocation,
    });

    const anthropicClient = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const claudeStart = Date.now();
    const {
      object: proposalContent,
      usage,
      finishReason,
    } = await generateObject({
      model: anthropicClient('claude-sonnet-4-6'),
      schema: proposalSchema,
      system: buildSystemPrompt(systemDate),
      prompt: finalPrompt,
    });
    const claudeMs = Date.now() - claudeStart;

    // claude-sonnet-4-6 pricing: $3/M input tokens, $15/M output tokens
    const inputCost = ((usage?.inputTokens ?? 0) / 1_000_000) * 3;
    const outputCost = ((usage?.outputTokens ?? 0) / 1_000_000) * 15;

    log.info(ctx.reqId, 'Proposal generated', {
      title: proposalContent.title,
      category: proposalContent.category,
      priority: proposalContent.priority,
      finishReason,
      claudeMs,
      tokens: {
        input: usage?.inputTokens,
        output: usage?.outputTokens,
      },
      costUsd: (inputCost + outputCost).toFixed(6),
    });

    const [proposal] = await sql`
      INSERT INTO proposals (property_id, status, title, content)
      VALUES (${propertyId}, 'pending', ${proposalContent.title}, ${JSON.stringify(proposalContent)})
      RETURNING id, property_id, status, title, content, created_at
    `;

    log.info(ctx.reqId, 'Proposal saved', {
      proposalId: proposal.id,
      elapsedMs: Date.now() - ctx.reqStart,
    });

    return proposal as Record<string, unknown>;
  } catch (error) {
    log.err(ctx, error);
    throw error;
  }
}
