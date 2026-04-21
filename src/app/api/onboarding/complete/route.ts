import { createRouteLogger } from '@/lib/route-logger';
import { auth } from '@/lib/auth/server';
import { sql } from '@/lib/db';
import { z } from 'zod';
const log = createRouteLogger('onboarding-complete');

const numericString = z.string().regex(/^-?\d+(\.\d+)?$/, 'Must be a numeric string');

const attributeSchema = z.object({
  key: z.string(),
  value: z.string(),
  unit: z.string().nullable(),
  confidence: z.number(),
  label: z.string(),
  source: z.string(),
  isLocked: z.boolean(),
});

const bodySchema = z.object({
  zip: z.string().regex(/^\d{5}$/),
  lat: numericString,
  lng: numericString,
  zone: z.string(),
  proposal: z.object({
    title: z.string(),
    summary: z.string(),
    rationale: z.string(),
    category: z.string(),
    priority: z.string(),
    timing: z.string(),
    product_suggestion: z.string().nullable(),
    commerce_url: z.string().nullable(),
    estimated_cost_usd: z.number().nullable(),
    attribute_keys_affected: z.array(z.string()),
  }),
  attributes: z.array(attributeSchema),
});

export async function POST(req: Request): Promise<Response> {
  const ctx = log.begin();

  try {
    const { data: session } = await auth.getSession();
    if (!session?.user) {
      return log.end(ctx, Response.json({ error: 'Unauthorized' }, { status: 401 }));
    }

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return log.end(
        ctx,
        Response.json({ error: 'Invalid request', issues: parsed.error.issues }, { status: 400 })
      );
    }

    const { zip, lat, lng, proposal, attributes } = parsed.data;
    const userId = session.user.id;

    log.info(ctx.reqId, 'Completing onboarding', { userId, zip });

    // ── Sequential writes ──────────────────────────────────────────────────
    // WARNING: These are three separate HTTP queries, not a transaction.
    // If a later INSERT fails, earlier rows become orphans. At current scale
    // this is acceptable. If it happens: delete the orphaned properties row
    // manually (yard_properties and proposals cascade on delete).
    // TODO: Migrate to a pooled connection with BEGIN/COMMIT when volume warrants it.

    // Idempotency guard: if a property already exists for this user (e.g. network
    // retry after a successful write), return the existing IDs and skip re-insertion.
    const existing = await sql`
      SELECT p.id as property_id, pr.id as proposal_id
      FROM properties p
      LEFT JOIN proposals pr ON pr.property_id = p.id
      WHERE p.user_id = ${userId}
      LIMIT 1
    `;
    if (existing[0]) {
      log.info(ctx.reqId, 'Property already exists, skipping re-insert (idempotent retry)', {
        propertyId: existing[0].property_id,
      });
      return log.end(
        ctx,
        Response.json({ ok: true, propertyId: existing[0].property_id, proposalId: existing[0].proposal_id })
      );
    }

    // 1. Create property
    const [property] = await sql`
      INSERT INTO properties (user_id, address, lat, lng)
      VALUES (${userId}, ${zip}, ${parseFloat(lat)}, ${parseFloat(lng)})
      RETURNING id
    `;

    const propertyId = property.id as string;
    log.info(ctx.reqId, 'Property created', { propertyId });

    // 2. Insert inferred yard attributes
    for (const attr of attributes) {
      // Skip lat/lng — stored on properties row, not as yard attributes
      if (attr.key === 'latitude' || attr.key === 'longitude') continue;

      await sql`
        INSERT INTO yard_properties (
          property_id, attribute_key, attribute_value, value_unit,
          confidence_score, confidence_label, source, is_locked, created_by
        ) VALUES (
          ${propertyId}, ${attr.key}, ${attr.value}, ${attr.unit},
          ${attr.confidence}, ${attr.label}, ${attr.source}, ${attr.isLocked}, ${'system'}
        )
      `;
    }

    log.info(ctx.reqId, 'Yard properties written', {
      count: attributes.filter((a) => a.key !== 'latitude' && a.key !== 'longitude').length,
    });

    // 3. Insert proposal
    const [proposalRow] = await sql`
      INSERT INTO proposals (property_id, status, title, content)
      VALUES (${propertyId}, 'pending', ${proposal.title}, ${JSON.stringify(proposal)})
      RETURNING id
    `;

    log.info(ctx.reqId, 'Proposal saved', { proposalId: proposalRow.id });

    return log.end(ctx, Response.json({ ok: true, propertyId, proposalId: proposalRow.id }));
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
