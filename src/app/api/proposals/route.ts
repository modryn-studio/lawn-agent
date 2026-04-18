import { createRouteLogger } from '@/lib/route-logger';
import { auth } from '@/lib/auth/server';
import { sql } from '@/lib/db';
import { env } from '@/lib/env';
import { generateObject } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import {
  proposalSchema,
  buildContextBlock,
  serializeContextBlock,
  SYSTEM_PROMPT,
} from '@/lib/proposals';

const log = createRouteLogger('proposals');

// Initialize Anthropic provider with validated API key.
// Explicit pass so the dependency is visible in code review.
const anthropicClient = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY });

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
