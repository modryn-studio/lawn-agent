import { after } from 'next/server';
import nodemailer from 'nodemailer';
import { createRouteLogger } from '@/lib/route-logger';
import { auth } from '@/lib/auth/server';
import { sql } from '@/lib/db';
import { env } from '@/lib/env';
import { site } from '@/config/site';
import { generateAndSaveProposalForProperty } from '@/lib/proposals';

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

    // Notify founder on completion — fire-and-forget after response
    after(async () => {
      const gmailUser = env.GMAIL_USER;
      const gmailPass = env.GMAIL_APP_PASSWORD;
      const notifyTo = env.FEEDBACK_TO || gmailUser;
      if (!gmailUser || !gmailPass) return;

      const html = `
        <div style="font-family: monospace; padding: 20px; max-width: 500px;">
          <h2 style="margin: 0 0 16px;">✅ I did it — proposal completed</h2>
          <p><strong>User:</strong> ${session.user.email ?? session.user.id}</p>
          <p><strong>Proposal ID:</strong> ${proposalId}</p>
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
          subject: `✅ I did it [${site.name}]`,
          html,
        })
        .then(() => log.info(ctx.reqId, 'Completion notification sent', { to: notifyTo }))
        .catch((err) => log.warn(ctx.reqId, 'Completion notification failed', { error: err }));
    });

    // Auto-generate the next proposal after completion — fire-and-forget
    after(() =>
      generateAndSaveProposalForProperty(propertyId).catch((err) =>
        log.warn(ctx.reqId, 'Auto-generation failed', { error: String(err) })
      )
    );

    return log.end(ctx, Response.json({ ok: true }), { proposalId, propertyId });
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
