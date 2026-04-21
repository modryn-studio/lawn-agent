import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth/server';
import { sql } from '@/lib/db';
import { site } from '@/config/site';
import { AttributeCard } from '@/components/ui/attribute-card';
import type { ProposalContent } from '@/lib/proposals';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `Dashboard | ${site.name}`,
  description: 'Your current yard proposal and inferred yard profile.',
  openGraph: {
    title: `Dashboard | ${site.name}`,
    description: 'Your current yard proposal and inferred yard profile.',
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
      SELECT content
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

  const proposal = proposalRows[0] ? (proposalRows[0].content as ProposalContent) : null;

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
    <main className="flex min-h-dvh flex-col px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto w-full max-w-md space-y-8">
        <h1 className="font-heading text-text text-3xl font-normal tracking-tight md:text-[40px]">
          Your yard.
        </h1>

        {proposal ? (
          <div className="space-y-6">
            {/* Proposal */}
            <div className="border-border bg-surface rounded-lg border p-5 sm:p-8">
              {zone && (
                <p className="text-muted mb-4 text-xs uppercase tracking-widest">Zone {zone}</p>
              )}
              {proposal.title && (
                <p className="text-text text-base leading-snug font-medium">{proposal.title}</p>
              )}
              <p className="text-text mt-3 text-[15px] leading-relaxed">{proposal.summary}</p>
              <p className="text-muted mt-2 text-sm">{proposal.timing}</p>
              {proposal.product_suggestion && (
                <p className="text-accent mt-6 text-sm">{proposal.product_suggestion}</p>
              )}
              {proposal.commerce_url && (
                <a
                  href={proposal.commerce_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent mt-4 block py-2 text-sm underline-offset-2 hover:underline"
                >
                  What to buy →
                </a>
              )}
            </div>

            {/* Attributes — directly below, no heading. Proximity carries the relationship. */}
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
        ) : (
          <p className="text-muted text-sm">No active proposals. Check back soon.</p>
        )}
      </div>
    </main>
  );
}
