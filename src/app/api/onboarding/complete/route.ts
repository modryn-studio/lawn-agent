import { after } from 'next/server';
import nodemailer from 'nodemailer';
import { createRouteLogger } from '@/lib/route-logger';
import { auth } from '@/lib/auth/server';
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
    estimated_cost_usd: z.number().nullable(),
    attribute_keys_affected: z.array(z.string()),
    attribute_context: z
      .object({
        hardiness_zone: z.string().optional(),
        grass_type: z.string().optional(),
        soil_type: z.string().optional(),
      })
      .optional(),
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

    const { zip, lat, lng, zone, proposal, attributes } = parsed.data;
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
        Response.json({
          ok: true,
          propertyId: existing[0].property_id,
          proposalId: existing[0].proposal_id,
        })
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

    const grassType = attributes.find((a) => a.key === 'grass_type')?.value ?? 'unknown';

    after(async () => {
      const gmailUser = env.GMAIL_USER;
      const gmailPass = env.GMAIL_APP_PASSWORD;
      const notifyTo = env.FEEDBACK_TO || gmailUser;

      if (!gmailUser || !gmailPass) {
        log.warn(ctx.reqId, 'Gmail credentials not configured — skipping signup notification');
        return;
      }

      const html = `
        <div style="font-family: monospace; padding: 20px; max-width: 500px;">
          <h2 style="margin: 0 0 16px;">🌱 New signup</h2>
          <p><strong>Zip:</strong> ${escapeHtml(zip)}</p>
          <p><strong>Zone:</strong> ${escapeHtml(zone)}</p>
          <p><strong>Grass type:</strong> ${escapeHtml(grassType)}</p>
          <p><strong>Proposal:</strong> ${escapeHtml(proposal.title)}</p>
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
          subject: `🌱 New signup [${site.name}] zip ${zip} / Zone ${zone}`,
          html,
        })
        .then(() => log.info(ctx.reqId, 'Signup notification sent', { to: notifyTo }))
        .catch((err) => log.warn(ctx.reqId, 'Signup notification failed', { error: err }));
    });

    return log.end(ctx, Response.json({ ok: true, propertyId, proposalId: proposalRow.id }));
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
