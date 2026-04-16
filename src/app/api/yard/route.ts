import { createRouteLogger } from '@/lib/route-logger';
import { auth } from '@/lib/auth/server';
import { sql } from '@/lib/db';
import { z } from 'zod';

const log = createRouteLogger('yard');

// POST body schema
const postSchema = z.object({
  propertyId: z.string().uuid(),
  attributeKey: z.string().min(1),
  attributeValue: z.string().min(1),
  valueUnit: z.string().nullable().optional(),
  source: z.enum([
    'regional_inference',
    'satellite_analysis',
    'usda_api',
    'user_confirmed',
    'user_corrected',
    'user_logged',
    'proposal_feedback_implicit',
  ]),
  confidenceScore: z.number().min(0).max(1),
  confidenceLabel: z.enum(['assumed', 'inferred', 'confirmed', 'corrected']),
  isLocked: z.boolean().optional().default(false),
  createdBy: z.string().optional().default('system'),
});

// GET — return current snapshot for a property
// Named debt: returns flat rows, not a stratified PropertyContextBlock.
// Shape will change when the proposal engine ships in Week 3.
export async function GET(req: Request): Promise<Response> {
  const ctx = log.begin();

  try {
    const { data: session } = await auth.getSession();
    if (!session?.user) {
      return log.end(ctx, Response.json({ error: 'Unauthorized' }, { status: 401 }));
    }

    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get('propertyId');

    if (!propertyId || !z.string().uuid().safeParse(propertyId).success) {
      return log.end(
        ctx,
        Response.json({ error: 'propertyId is required and must be a UUID' }, { status: 400 })
      );
    }

    log.info(ctx.reqId, 'Fetching yard snapshot', { propertyId });

    // Verify property belongs to the requesting user
    const [property] = await sql`
      SELECT id FROM properties WHERE id = ${propertyId} AND user_id = ${session.user.id}
    `;
    if (!property) {
      return log.end(ctx, Response.json({ error: 'Not found' }, { status: 404 }));
    }

    // Context snapshot query — per design doc
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

    return log.end(ctx, Response.json({ rows }), { count: rows.length });
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST — upsert a yard attribute (flip previous is_current, insert new version)
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

    const {
      propertyId,
      attributeKey,
      attributeValue,
      valueUnit,
      source,
      confidenceScore,
      confidenceLabel,
      isLocked,
      createdBy,
    } = parsed.data;

    log.info(ctx.reqId, 'Upserting yard attribute', { propertyId, attributeKey, source });

    // Verify property belongs to the requesting user
    const [property] = await sql`
      SELECT id FROM properties WHERE id = ${propertyId} AND user_id = ${session.user.id}
    `;
    if (!property) {
      return log.end(ctx, Response.json({ error: 'Not found' }, { status: 404 }));
    }

    // Get current version number (if any)
    const [existing] = await sql`
      SELECT version FROM yard_properties
      WHERE property_id = ${propertyId}
        AND attribute_key = ${attributeKey}
        AND is_current = true
    `;

    const nextVersion = existing ? (existing.version as number) + 1 : 1;

    // Transaction: flip old row, insert new row
    const [newRow] = await sql.transaction((trx) => [
      // Flip previous current row
      ...(existing
        ? [
            trx`
            UPDATE yard_properties
            SET is_current = false
            WHERE property_id = ${propertyId}
              AND attribute_key = ${attributeKey}
              AND is_current = true
          `,
          ]
        : []),
      // Insert new current row
      trx`
        INSERT INTO yard_properties
          (property_id, attribute_key, attribute_value, value_unit,
           version, is_current, source, confidence_score, confidence_label,
           is_locked, created_by)
        VALUES
          (${propertyId}, ${attributeKey}, ${attributeValue}, ${valueUnit ?? null},
           ${nextVersion}, true, ${source}, ${confidenceScore}, ${confidenceLabel},
           ${isLocked}, ${createdBy})
        RETURNING id, version, created_at
      `,
    ]);

    return log.end(ctx, Response.json({ ok: true, row: newRow }), {
      propertyId,
      attributeKey,
      version: nextVersion,
    });
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
