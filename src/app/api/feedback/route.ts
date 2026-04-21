import { createRouteLogger } from '@/lib/route-logger';
import { env } from '@/lib/env';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { site } from '@/config/site';
import { after } from 'next/server';
import { z } from 'zod';

const log = createRouteLogger('feedback');

// Discriminated union: newsletter requires a valid email, feedback/bug do not.
// This makes the constraint structural — the newsletter branch has email: string,
// not email: string | undefined, so no non-null assertions needed downstream.
const bodySchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('newsletter'),
    email: z.string().email(),
    message: z.string().optional(),
    page: z.string().optional(),
  }),
  z.object({
    type: z.literal('feedback'),
    email: z.string().email().optional(),
    message: z.string().optional(),
    page: z.string().optional(),
  }),
  z.object({
    type: z.literal('bug'),
    email: z.string().email().optional(),
    message: z.string().optional(),
    page: z.string().optional(),
  }),
]);

type FeedbackBody = z.infer<typeof bodySchema>;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function buildHtml(body: FeedbackBody): string {
  const heading =
    body.type === 'newsletter'
      ? '📬 New Newsletter Signup'
      : body.type === 'feedback'
        ? '💬 New Feedback'
        : '🐛 Bug Report';

  const email = escapeHtml(body.email || '(not provided)');
  const message = body.message ? escapeHtml(body.message) : null;
  const page = body.page ? escapeHtml(body.page) : null;

  return `
    <div style="font-family: monospace; padding: 20px; max-width: 500px;">
      <h2 style="margin: 0 0 16px;">${heading}</h2>
      <p><strong>Email:</strong> ${email}</p>
      ${message ? `<p><strong>Message:</strong><br/>${message}</p>` : ''}
      ${page ? `<p><strong>Page:</strong> ${page}</p>` : ''}
      <hr style="margin: 16px 0; border: 1px solid #333;" />
      <p style="color: #666; font-size: 12px;">Sent from <strong>${site.name}</strong> &mdash; <a href="${site.url}">${site.url}</a></p>
    </div>
  `;
}

export async function POST(req: Request): Promise<Response> {
  const ctx = log.begin();

  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      log.warn(ctx.reqId, 'Validation failed', { errors: parsed.error.flatten() });
      return log.end(ctx, Response.json({ error: 'Invalid request' }, { status: 400 }));
    }

    const body = parsed.data;
    log.info(ctx.reqId, 'Request received', { type: body.type, email: body.email });

    // Check env vars
    const gmailUser = env.GMAIL_USER;
    const gmailPass = env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailPass) {
      log.warn(ctx.reqId, 'Gmail credentials not configured');
      return log.end(ctx, Response.json({ error: 'Email service unavailable' }, { status: 503 }));
    }

    // gmailUser is narrowed to string here — feedbackTo is always a string
    const feedbackTo = env.FEEDBACK_TO || gmailUser;

    // Respond immediately — fire Gmail + Resend in parallel after the response
    after(async () => {
      const subjectMap: Record<FeedbackBody['type'], string> = {
        newsletter: `📬 [${site.name}] New signup: ${body.email}`,
        feedback: `💬 [${site.name}] Feedback${body.email ? ` from ${body.email}` : ''}`,
        bug: `🐛 [${site.name}] Bug report${body.email ? ` from ${body.email}` : ''}`,
      };

      const emailPromise = nodemailer
        .createTransport({ service: 'gmail', auth: { user: gmailUser, pass: gmailPass } })
        .sendMail({
          from: gmailUser,
          to: feedbackTo,
          subject: subjectMap[body.type],
          html: buildHtml(body),
          ...(body.email && { replyTo: body.email }),
        })
        .then(() => log.info(ctx.reqId, 'Email sent', { to: feedbackTo }))
        .catch((err) => log.warn(ctx.reqId, 'Email send failed', { error: err }));

      const resendPromise =
        body.type === 'newsletter'
          ? (() => {
              const resendKey = env.RESEND_API_KEY;
              if (!resendKey) {
                log.warn(ctx.reqId, 'Resend not configured — signup not saved to contacts');
                return Promise.resolve();
              }
              const resend = new Resend(resendKey);
              const segmentId = env.RESEND_SEGMENT_ID;
              return resend.contacts
                .create({
                  email: body.email,
                  unsubscribed: false,
                  ...(segmentId && { segments: [{ id: segmentId }] }),
                  properties: { source: site.name },
                })
                .then(() =>
                  log.info(ctx.reqId, 'Resend contact created', { segmentId, source: site.name })
                )
                .catch((err) =>
                  log.warn(ctx.reqId, 'Resend contact creation failed', { error: err })
                );
            })()
          : Promise.resolve();

      await Promise.all([emailPromise, resendPromise]);
    });

    return log.end(ctx, Response.json({ ok: true }));
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
