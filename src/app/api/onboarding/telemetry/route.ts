import { after } from 'next/server';
import nodemailer from 'nodemailer';
import { createRouteLogger } from '@/lib/route-logger';
import { sql } from '@/lib/db';
import { env } from '@/lib/env';
import { site } from '@/config/site';
import { z } from 'zod';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

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

    const updated = await sql`
      UPDATE proposal_telemetry
      SET outcome = ${outcome}
      WHERE id = ${telemetryId}
        AND outcome IS NULL
      RETURNING zip, climate_zone, proposal_title
    `;

    after(async () => {
      if (!updated[0]) return; // duplicate call — outcome already set, skip
      const { zip, climate_zone, proposal_title } = updated[0] as {
        zip: string | null;
        climate_zone: string | null;
        proposal_title: string | null;
      };

      const safeZip = zip ?? 'unknown';
      const safeZone = climate_zone ?? 'unknown';
      const safeTitle = proposal_title ?? 'unknown';

      const gmailUser = env.GMAIL_USER;
      const gmailPass = env.GMAIL_APP_PASSWORD;
      const notifyTo = env.FEEDBACK_TO || gmailUser;

      if (!gmailUser || !gmailPass) {
        log.warn(ctx.reqId, 'Gmail credentials not configured — skipping outcome notification');
        return;
      }

      const outcomeLabel = outcome === 'approved' ? '✅ Approved' : '⏭️ Passed';
      const html = `
        <div style="font-family: monospace; padding: 20px; max-width: 500px;">
          <h2 style="margin: 0 0 16px;">${outcomeLabel} — anonymous user</h2>
          <p><strong>Zip:</strong> ${escapeHtml(safeZip)}</p>
          <p><strong>Zone:</strong> ${escapeHtml(safeZone)}</p>
          <p><strong>Proposal:</strong> ${escapeHtml(safeTitle)}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          <hr style="margin: 16px 0; border: 1px solid #333;" />
          <p style="color: #666; font-size: 12px;">Sent from <strong>${site.name}</strong> &mdash; <a href="${site.url}">${site.url}</a></p>
        </div>
      `;

      await nodemailer
        .createTransport({ service: 'gmail', auth: { user: gmailUser, pass: gmailPass } })
        .sendMail({
          from: gmailUser,
          to: notifyTo,
          subject: `${outcomeLabel} [${site.name}] zip ${safeZip} / Zone ${safeZone}`,
          html,
        })
        .then(() => log.info(ctx.reqId, 'Outcome notification sent', { to: notifyTo, outcome }))
        .catch((err) => log.warn(ctx.reqId, 'Outcome notification failed', { error: err }));
    });

    return log.end(ctx, Response.json({ ok: true }), { telemetryId, outcome });
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
