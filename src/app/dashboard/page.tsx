import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth/server';
import { sql } from '@/lib/db';
import { site } from '@/config/site';
import { AttributeCard } from '@/components/ui/attribute-card';
import type { ProposalContent } from '@/lib/proposals';
import { DashboardProposalCard } from '@/components/dashboard-proposal-card';
import { DashboardHeader } from '@/components/dashboard-header';

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

function sublabel(key: string, confidenceLabel: string, source: string): string {
  if (key === 'grass_type') return 'Based on your zone';
  if (source === 'usda_api') return 'From your zip code';
  if (source === 'regional_inference') return 'Regional estimate';
  if (confidenceLabel === 'confirmed') return 'Confirmed';
  return 'Inferred';
}

export default async function DashboardPage() {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect('/onboarding');

  // Find property for this user
  const [property] = await sql`
    SELECT id FROM properties WHERE user_id = ${session.user.id} LIMIT 1
  `;
  if (!property) redirect('/onboarding');

  const propertyId = property.id as string;

  // Parallel: fetch pending proposal + current yard attributes
  const [proposalRows, attributeRows] = await Promise.all([
    sql`
      SELECT id, content
      FROM proposals
      WHERE property_id = ${propertyId}
        AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1
    `,
    sql`
      SELECT attribute_key, attribute_value, confidence_label, source
      FROM yard_properties
      WHERE property_id = ${propertyId}
        AND is_current = true
    `,
  ]);

  const proposalRow = proposalRows[0] ?? null;
  const proposal = proposalRow ? (proposalRow.content as ProposalContent) : null;
  const proposalId = proposalRow ? (proposalRow.id as string) : null;

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
            {/* Proposal — only when pending */}
            {proposal && proposalId ? (
              <DashboardProposalCard
                proposal={proposal}
                proposalId={proposalId}
                propertyId={propertyId}
                zone={zone}
              />
            ) : (
              <p className="text-muted text-sm">
                Your agent is watching. We&apos;ll surface the next action when the window opens.
              </p>
            )}

            {/* Attributes — always visible. The yard profile persists independent of proposal state. */}
            {attributes.length > 0 && (
              <ul className="space-y-4">
                {attributes.map((attr) => (
                  <AttributeCard
                    key={attr.key}
                    label={displayLabel(attr.key, attr.value)}
                    sublabel={sublabel(attr.key, attr.confidenceLabel, attr.source)}
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
