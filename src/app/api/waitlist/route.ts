import { createRouteLogger } from '@/lib/route-logger';
import { sql } from '@/lib/db';
import { env } from '@/lib/env';
import { site } from '@/config/site';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import { after } from 'next/server';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

const log = createRouteLogger('waitlist');

const bodySchema = z.object({
  email: z.string().email(),
  country: z.string().nullable().optional(),
  source: z.string().optional().default('onboarding'),
  zip: z.string().nullable().optional(),
});

export async function POST(req: Request): Promise<Response> {
  const ctx = log.begin();

  // Skip all DB writes in development — keeps waitlist clean during local testing.
  if (process.env.NODE_ENV === 'development') {
    return log.end(ctx, Response.json({ ok: true }), { skipped: 'development' });
  }

  try {
    const parsed = bodySchema.safeParse(await req.json());

    if (!parsed.success) {
      log.warn(ctx.reqId, 'Validation failed', { errors: parsed.error.flatten() });
      return log.end(ctx, Response.json({ error: 'Invalid request' }, { status: 400 }));
    }

    // country may be null if geocoding failed or returned incomplete data on retry
    // this is intentional — null means "unknown", not missing
    const { email, country = null, source, zip = null } = parsed.data;
    log.info(ctx.reqId, 'Upserting waitlist entry', { email, country, source, zip });

    const [row] = await sql`
      INSERT INTO waitlist (email, country, source, zip)
      VALUES (${email}, ${country}, ${source}, ${zip})
      ON CONFLICT (email)
      DO UPDATE SET
        country = COALESCE(waitlist.country, EXCLUDED.country),
        source  = COALESCE(waitlist.source,  EXCLUDED.source),
        zip     = COALESCE(waitlist.zip,     EXCLUDED.zip)
      RETURNING id, email, country, source, zip, created_at
    `;

    // Notify founder — fire-and-forget after response
    after(async () => {
      const gmailUser = env.GMAIL_USER;
      const gmailPass = env.GMAIL_APP_PASSWORD;
      const feedbackTo = env.FEEDBACK_TO || gmailUser;

      if (!gmailUser || !gmailPass) {
        log.warn(ctx.reqId, 'Gmail credentials not configured — skipping notification');
        return;
      }

      const sourceLabel =
        source === 'pass' ? '⏭️ Pass' : source === 'non_us' ? '🌍 Non-US' : '📬 Waitlist';
      const safeEmail = escapeHtml(email);
      const safeSource = escapeHtml(source);
      const zipLine = zip ? `<p><strong>Zip:</strong> ${escapeHtml(zip)}</p>` : '';
      const countryLine = country ? `<p><strong>Country:</strong> ${escapeHtml(country)}</p>` : '';

      const html = `
        <div style="font-family: monospace; padding: 20px; max-width: 500px;">
          <h2 style="margin: 0 0 16px;">${sourceLabel} — New waitlist signup</h2>
          <p><strong>Email:</strong> ${safeEmail}</p>
          <p><strong>Source:</strong> ${safeSource}</p>
          ${zipLine}
          ${countryLine}
          <hr style="margin: 16px 0; border: 1px solid #333;" />
          <p style="color: #666; font-size: 12px;">Sent from <strong>${site.name}</strong> &mdash; <a href="${site.url}">${site.url}</a></p>
        </div>
      `;

      await nodemailer
        .createTransport({ service: 'gmail', auth: { user: gmailUser, pass: gmailPass } })
        .sendMail({
          from: gmailUser,
          to: feedbackTo,
          subject: `${sourceLabel} [${site.name}] ${email}`,
          html,
        })
        .then(() => log.info(ctx.reqId, 'Founder notification sent', { to: feedbackTo }))
        .catch((err) => log.warn(ctx.reqId, 'Founder notification failed', { error: err }));
    });

    return log.end(ctx, Response.json({ ok: true, id: row.id }), { email });
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
