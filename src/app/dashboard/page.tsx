import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth/server';
import { sql } from '@/lib/db';
import { site } from '@/config/site';
import { AttributeCard } from '@/components/ui/attribute-card';
import type { ProposalContent } from '@/lib/proposals';
import { DashboardProposalCard } from '@/components/dashboard-proposal-card';
import { DashboardHeader } from '@/components/dashboard-header';
import { fetchWeatherContext, type WeatherContext } from '@/lib/weather';
import { evaluateProposalValidity, type ValidityState } from '@/lib/proposal-validity';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `Active Lawn Proposals and Yard Profile | ${site.name}`,
  description:
    'See your active lawn proposal and yard profile. Approve treatments, track what you have done, and let Lawn Agent build a picture of your yard over time.',
  openGraph: {
    title: `Active Lawn Proposals and Yard Profile | ${site.name}`,
    description:
      'See your active lawn proposal and yard profile. Approve treatments, track what you have done, and let Lawn Agent build a picture of your yard over time.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: site.name }],
    siteName: site.name,
  },
  twitter: { card: 'summary_large_image' },
};

// Display helpers — same logic as ProfileScreen
// Uppercases first letter of each word, including after hyphens:
// "cool-season grass" → "Cool-Season Grass"
function toTitleCase(str: string): string {
  return str.replace(/(?:^|[\s-])(\w)/g, (match) => match.toUpperCase());
}

const DISPLAY_KEYS = ['hardiness_zone', 'grass_type', 'soil_type'] as const;

function displayLabel(key: string, value: string): string {
  if (key === 'hardiness_zone') return `USDA Zone ${value}`;
  return toTitleCase(value);
}

function sublabel(
  key: string,
  confidenceLabel: string,
  source: string,
  attributeContext?: Record<string, string> | null
): string {
  // Claude-generated contextual copy takes priority when available
  if (attributeContext?.[key]) return attributeContext[key];
  // Static fallback for old proposals or when attribute_context is absent
  if (key === 'grass_type') return 'Based on your zone';
  if (source === 'usda_api') return 'From your zip code';
  if (source === 'regional_inference') return 'Regional estimate';
  if (confidenceLabel === 'confirmed') return 'Confirmed';
  return 'Inferred';
}

export default async function DashboardPage() {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect('/signin?redirect=/dashboard');

  // Find property for this user. Select lat/lng so we can fetch live weather
  // for the validity evaluator (consumed downstream — see weatherCtx below).
  const [property] = await sql`
    SELECT id, lat, lng FROM properties WHERE user_id = ${session.user.id} LIMIT 1
  `;
  if (!property) redirect('/onboarding');

  const propertyId = property.id as string;
  const propertyLat = (property.lat as string | null) ?? null;
  const propertyLng = (property.lng as string | null) ?? null;

  // Parallel: proposals + yard attributes + live weather.
  // Weather is the single source of truth for the validity evaluator (one fetch,
  // many consumers). Failure is non-fatal — null weatherCtx means the evaluator
  // treats all conditions as valid, same graceful-degradation pattern as the
  // onboarding proposal route. Skipped entirely when lat/lng are missing.
  const [proposalRows, attributeRows, weatherCtx]: [
    Record<string, unknown>[],
    Record<string, unknown>[],
    WeatherContext | null,
  ] = await Promise.all([
    sql`
      SELECT id, content, status, validity_conditions, last_evaluated_at
      FROM proposals
      WHERE property_id = ${propertyId}
      ORDER BY
        CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
        created_at DESC
      LIMIT 2
    `,
    sql`
      SELECT attribute_key, attribute_value, confidence_label, source
      FROM yard_properties
      WHERE property_id = ${propertyId}
        AND is_current = true
    `,
    propertyLat && propertyLng
      ? fetchWeatherContext(propertyLat, propertyLng).catch((error) => {
          console.warn('[dashboard] Weather fetch failed, continuing without validity evaluation', {
            error: String(error),
          });
          return null;
        })
      : Promise.resolve(null),
  ]);

  // First row is pending if one exists (sorted above), otherwise null.
  const pendingRow = proposalRows.find((r) => r.status === 'pending') ?? null;
  const proposal = pendingRow ? (pendingRow.content as ProposalContent) : null;
  const proposalId = pendingRow ? (pendingRow.id as string) : null;

  // Evaluate the pending proposal's validity against live weather.
  // 'valid' and 'expiring_soon' → render the card normally.
  // 'expired' → card renders its own expired beat ("Window closed [date].").
  // null validity_conditions = pre-instrumentation proposal = always valid.
  // null weatherCtx = weather unavailable = degrade to valid.
  const validityState: ValidityState = evaluateProposalValidity(
    pendingRow?.validity_conditions ?? null,
    weatherCtx
  );

  // Stamp last_evaluated_at on first expiration detection.
  // Idempotent: AND last_evaluated_at IS NULL guard prevents double-writes.
  // Synchronous so the timestamp is available to the card on this same load.
  // Known quirk: stored in UTC, formatted in user's local timezone — user in
  // UTC-10 may see "May 9" instead of "May 10" if window closed at midnight UTC.
  let lastEvaluatedAt = (pendingRow?.last_evaluated_at as string | null) ?? null;
  if (validityState === 'expired' && pendingRow && lastEvaluatedAt === null) {
    const [stamped] = await sql`
      UPDATE proposals
      SET last_evaluated_at = NOW()
      WHERE id = ${pendingRow.id as string}
        AND last_evaluated_at IS NULL
        AND status = 'pending'
      RETURNING last_evaluated_at
    `;
    lastEvaluatedAt = (stamped?.last_evaluated_at as string) ?? new Date().toISOString();
  }
  // Use the most recent proposal (any status) for attribute_context so sublabels
  // remain contextual after the user approves or passes their proposal.
  const latestProposal = proposalRows[0] ? (proposalRows[0].content as ProposalContent) : null;
  const attributeContext = latestProposal?.attribute_context ?? null;

  const attributes = attributeRows
    .filter((r) => (DISPLAY_KEYS as readonly string[]).includes(r.attribute_key as string))
    .map((r) => ({
      key: r.attribute_key as string,
      value: r.attribute_value as string,
      confidenceLabel: r.confidence_label as string,
      source: r.source as string,
    }))
    .sort(
      (a, b) =>
        DISPLAY_KEYS.indexOf(a.key as (typeof DISPLAY_KEYS)[number]) -
        DISPLAY_KEYS.indexOf(b.key as (typeof DISPLAY_KEYS)[number])
    );

  const zone = attributes.find((a) => a.key === 'hardiness_zone')?.value ?? null;

  return (
    <div className="flex min-h-dvh flex-col">
      <DashboardHeader />
      <main className="flex flex-1 flex-col px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto w-full max-w-md space-y-8">
          <h1 className="font-heading text-text text-3xl font-normal tracking-tight md:text-[40px]">
            Your yard.
          </h1>

          <div className="space-y-6">
            {/* Proposal — only when pending. Card owns its own expired state rendering. */}
            {proposal && proposalId ? (
              <DashboardProposalCard
                proposal={proposal}
                proposalId={proposalId}
                propertyId={propertyId}
                zone={zone}
                validityState={validityState}
                lastEvaluatedAt={lastEvaluatedAt}
              />
            ) : (
              <div className="border-border rounded-lg border bg-white p-5 text-center sm:p-8">
                <p className="text-muted text-[15px] leading-relaxed">
                  Your agent is watching. We&apos;ll surface the next action when the window opens.
                </p>
              </div>
            )}

            {/* Attributes — always visible. The yard profile persists independent of proposal state. */}
            {attributes.length > 0 && (
              <ul className="space-y-4">
                {attributes.map((attr) => (
                  <AttributeCard
                    key={attr.key}
                    label={displayLabel(attr.key, attr.value)}
                    sublabel={sublabel(
                      attr.key,
                      attr.confidenceLabel,
                      attr.source,
                      attributeContext
                    )}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
