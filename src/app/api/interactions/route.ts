import { createRouteLogger } from '@/lib/route-logger';
import { auth } from '@/lib/auth/server';
import { sql } from '@/lib/db';
import { z } from 'zod';

const log = createRouteLogger('interactions');

const postSchema = z.object({
  propertyId: z.string().uuid(),
  interactionType: z.enum(['confirm', 'correct', 'log', 'dismiss', 'complete', 'skip', 'commerce_click']),
  attributeKey: z.string().min(1).nullable().optional(),
  previousValue: z.string().nullable().optional(),
  newValue: z.string().nullable().optional(),
  sourceVersionId: z.string().uuid().nullable().optional(),
  proposalId: z.string().uuid().nullable().optional(),
  interactionContext: z
    .enum(['direct', 'proposal', 'onboarding', 'implicit'])
    .optional()
    .default('direct'),
  sessionId: z.string().nullable().optional(),
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

    const {
      propertyId,
      interactionType,
      attributeKey,
      previousValue,
      newValue,
      sourceVersionId,
      proposalId,
      interactionContext,
      sessionId,
    } = parsed.data;

    log.info(ctx.reqId, 'Logging interaction', { propertyId, interactionType, attributeKey });

    // Verify property belongs to the requesting user
    const [property] = await sql`
      SELECT id FROM properties WHERE id = ${propertyId} AND user_id = ${session.user.id}
    `;
    if (!property) {
      return log.end(ctx, Response.json({ error: 'Not found' }, { status: 404 }));
    }

    const [row] = await sql`
      INSERT INTO property_interactions
        (property_id, user_id, interaction_type, attribute_key,
         previous_value, new_value, source_version_id, proposal_id,
         interaction_context, session_id)
      VALUES
        (${propertyId}, ${session.user.id}, ${interactionType}, ${attributeKey ?? null},
         ${previousValue ?? null}, ${newValue ?? null}, ${sourceVersionId ?? null}, ${proposalId ?? null},
         ${interactionContext}, ${sessionId ?? null})
      RETURNING id, created_at
    `;

    return log.end(ctx, Response.json({ ok: true, row }), { propertyId, interactionType });
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
