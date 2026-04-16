import { createRouteLogger } from '@/lib/route-logger';
import { auth } from '@/lib/auth/server';
import { sql } from '@/lib/db';
import { env } from '@/lib/env';
import { generateObject } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

const log = createRouteLogger('proposals');

// Initialize Anthropic provider with validated API key.
// Explicit pass so the dependency is visible in code review.
const anthropicClient = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY });

// ── Proposal output schema ────────────────────────────────────────────────────
// Defines what claude-sonnet-4-6 must return. Stored verbatim in proposals.content.
const proposalSchema = z.object({
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
  commerce_url: z
    .string()
    .nullable()
    .describe('Amazon or home improvement store URL for the product, null if not applicable'),
  estimated_cost_usd: z
    .number()
    .nullable()
    .describe('Rough cost estimate in USD, null if not applicable'),
  attribute_keys_affected: z
    .array(z.string())
    .describe('Yard attribute keys this proposal directly addresses'),
});

// ── Context block types (from design doc) ────────────────────────────────────
interface AttributeContext {
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

function buildContextBlock(rows: Record<string, unknown>[]): {
  highConfidence: AttributeContext[];
  mediumConfidence: AttributeContext[];
  lowConfidence: AttributeContext[];
  lockedAttributes: AttributeContext[];
  totalAttributes: number;
  confirmedCount: number;
  dataMaturity: DataMaturity;
} {
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

// Serialize context block into the exact prompt format from the design doc.
// Consistency here matters: changing this format requires updating the system prompt.
function serializeContextBlock(
  propertyId: string,
  block: ReturnType<typeof buildContextBlock>
): string {
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
    lines.push('REQUIRES ACTION BEFORE RECOMMENDATION (locked — do not propose without):');
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

const SYSTEM_PROMPT = `You are a practical lawn care advisor. Your job is to produce one single, actionable proposal for a homeowner based on their yard data.

Rules:
- Propose only one action. The most impactful one given the current data.
- Write for someone who is not a lawn expert. Plain language only.
- Never use: "powerful", "seamless", "revolutionary", "AI-powered", "next-level", "smart", "intelligent".
- Be honest about what you don't know. If data is low-confidence, say so in the rationale.
- "Yard" = whole property (emotional). "Lawn" = grass specifically (actionable). Do not collapse.
- Locked attributes must not be assumed. If soil_ph is locked, do not propose lime or pH amendments — propose getting a soil test instead.
- commerce_url must be a real, working product URL (Amazon, Home Depot, Lowe's). If you cannot produce a reliable URL, set it to null.
- Do not hallucinate product names. If you are not confident in a specific product, set product_suggestion and commerce_url to null.`;

// ── POST handler ──────────────────────────────────────────────────────────────
const postSchema = z.object({
  propertyId: z.string().uuid(),
});

export async function POST(req: Request): Promise<Response> {
  const ctx = log.begin();

  try {
    const { data: session } = await auth.getSession();
    if (!session?.user) {
      return log.end(ctx, Response.json({ error: 'Unauthorized' }, { status: 401 }));
    }

    const body = await req.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return log.end(
        ctx,
        Response.json({ error: 'Invalid request', issues: parsed.error.issues }, { status: 400 })
      );
    }

    const { propertyId } = parsed.data;

    log.info(ctx.reqId, 'Generating proposal', { propertyId });

    // Verify property belongs to the requesting user
    const [property] = await sql`
      SELECT id FROM properties WHERE id = ${propertyId} AND user_id = ${session.user.id}
    `;
    if (!property) {
      return log.end(ctx, Response.json({ error: 'Not found' }, { status: 404 }));
    }

    // Pull context snapshot (same query as /api/yard GET)
    const rows = await sql`
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
    `;

    if (rows.length === 0) {
      return log.end(
        ctx,
        Response.json({ error: 'No yard data for this property yet' }, { status: 422 })
      );
    }

    const contextBlock = buildContextBlock(rows as Record<string, unknown>[]);
    const yardContext = serializeContextBlock(propertyId, contextBlock);

    log.info(ctx.reqId, 'Context built', {
      total: contextBlock.totalAttributes,
      confirmed: contextBlock.confirmedCount,
      maturity: contextBlock.dataMaturity,
    });

    // Call claude-sonnet-4-6 via AI SDK generateObject.
    // generateObject enforces schema conformance — no post-processing needed.
    const { object: proposalContent } = await generateObject({
      model: anthropicClient('claude-sonnet-4-6'),
      schema: proposalSchema,
      system: SYSTEM_PROMPT,
      prompt: yardContext,
    });

    log.info(ctx.reqId, 'Proposal generated', {
      title: proposalContent.title,
      category: proposalContent.category,
      priority: proposalContent.priority,
    });

    // Insert proposal into DB
    const [proposal] = await sql`
      INSERT INTO proposals (property_id, status, title, content)
      VALUES (${propertyId}, 'pending', ${proposalContent.title}, ${JSON.stringify(proposalContent)})
      RETURNING id, property_id, status, title, content, created_at
    `;

    return log.end(ctx, Response.json({ ok: true, proposal }), { proposalId: proposal.id });
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
