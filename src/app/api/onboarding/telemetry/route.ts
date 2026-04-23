import { createRouteLogger } from '@/lib/route-logger';
import { sql } from '@/lib/db';
import { z } from 'zod';

const log = createRouteLogger('onboarding-telemetry');

const bodySchema = z.object({
  telemetryId: z.string().uuid(),
  outcome: z.enum(['approved', 'passed']),
});

// PATCH /api/onboarding/telemetry
// Unauthenticated — matches the generation endpoint's security profile.
// Updates outcome on an existing proposal_telemetry row.
// AND outcome IS NULL guard prevents overwriting on duplicate calls.
// NOTE: No rate limit on this endpoint — named debt, add before Reddit outreach scales.
export async function PATCH(req: Request): Promise<Response> {
  const ctx = log.begin();

  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return log.end(
        ctx,
        Response.json({ error: 'Invalid request', issues: parsed.error.issues }, { status: 400 })
      );
    }

    const { telemetryId, outcome } = parsed.data;
    log.info(ctx.reqId, 'Updating telemetry outcome', { telemetryId, outcome });

    await sql`
      UPDATE proposal_telemetry
      SET outcome = ${outcome}
      WHERE id = ${telemetryId}
        AND outcome IS NULL
    `;

    return log.end(ctx, Response.json({ ok: true }), { telemetryId, outcome });
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
