import { createRouteLogger } from '@/lib/route-logger';
import { sql } from '@/lib/db';
import { z } from 'zod';

const log = createRouteLogger('waitlist');

const bodySchema = z.object({
  email: z.string().email(),
  country: z.string().nullable().optional(),
  source: z.string().optional().default('onboarding'),
});

export async function POST(req: Request): Promise<Response> {
  const ctx = log.begin();

  try {
    const parsed = bodySchema.safeParse(await req.json());

    if (!parsed.success) {
      log.warn(ctx.reqId, 'Validation failed', { errors: parsed.error.flatten() });
      return log.end(ctx, Response.json({ error: 'Invalid request' }, { status: 400 }));
    }

    // country may be null if geocoding failed or returned incomplete data on retry
    // this is intentional — null means "unknown", not missing
    const { email, country = null, source } = parsed.data;
    log.info(ctx.reqId, 'Upserting waitlist entry', { email, country, source });

    const [row] = await sql`
      INSERT INTO waitlist (email, country, source)
      VALUES (${email}, ${country}, ${source})
      ON CONFLICT (email)
      DO UPDATE SET
        country = EXCLUDED.country,
        source  = EXCLUDED.source
      RETURNING id, email, country, source, created_at
    `;

    return log.end(ctx, Response.json({ ok: true, id: row.id }), { email });
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
