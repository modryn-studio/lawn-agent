import { createRouteLogger } from '@/lib/route-logger';
import { auth } from '@/lib/auth/server';
import { sql } from '@/lib/db';
import { z } from 'zod';
import { generateAndSaveProposalForProperty } from '@/lib/proposals';

const log = createRouteLogger('proposals');

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

    // Verify property belongs to the requesting user before delegating to lib
    const [property] = await sql`
      SELECT id FROM properties WHERE id = ${propertyId} AND user_id = ${session.user.id}
    `;
    if (!property) {
      return log.end(ctx, Response.json({ error: 'Not found' }, { status: 404 }));
    }

    const proposal = await generateAndSaveProposalForProperty(propertyId);
    if (!proposal) {
      // null = pending proposal already exists, or no yard data yet
      return log.end(ctx, Response.json({ error: 'Could not generate proposal' }, { status: 422 }));
    }

    return log.end(ctx, Response.json({ ok: true, proposal }), {
      proposalId: proposal.id as string,
    });
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
