import { createRouteLogger } from '@/lib/route-logger';
import { auth } from '@/lib/auth/server';
import { sql } from '@/lib/db';

const log = createRouteLogger('proposals-complete');

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const ctx = log.begin();

  try {
    const { data: session } = await auth.getSession();
    if (!session?.user) {
      return log.end(ctx, Response.json({ error: 'Unauthorized' }, { status: 401 }));
    }

    const { id: proposalId } = await params;

    log.info(ctx.reqId, 'Completing proposal', { proposalId });

    // Fetch proposal + verify ownership via property FK
    const [proposal] = await sql`
      SELECT p.id, p.property_id, p.status
      FROM proposals p
      JOIN properties pr ON pr.id = p.property_id
      WHERE p.id = ${proposalId}
        AND pr.user_id = ${session.user.id}
    `;

    if (!proposal) {
      return log.end(ctx, Response.json({ error: 'Not found' }, { status: 404 }));
    }

    // Idempotent — already completed
    if (proposal.status !== 'pending') {
      return log.end(ctx, Response.json({ ok: true }), { proposalId, skipped: true });
    }

    const propertyId = proposal.property_id as string;

    // Single transaction: status flip + interaction log.
    // Generation call (v2) goes after this commit — not interleaved.
    await sql.transaction((trx) => [
      trx`
        UPDATE proposals
        SET status = 'done'
        WHERE id = ${proposalId}
      `,
      trx`
        INSERT INTO property_interactions
          (property_id, user_id, interaction_type, proposal_id, interaction_context)
        VALUES
          (${propertyId}, ${session.user.id}, 'complete', ${proposalId}, 'proposal')
      `,
    ]);

    return log.end(ctx, Response.json({ ok: true }), { proposalId, propertyId });
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
