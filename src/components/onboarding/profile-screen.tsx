'use client';

import { Button } from '@/components/ui/button';
import { AttributeCard } from '@/components/ui/attribute-card';
import type { InferredAttribute } from '@/lib/yard-inference';

interface ProfileScreenProps {
  attributes: InferredAttribute[];
  attributeContext?: { hardiness_zone?: string; grass_type?: string; soil_type?: string } | null;
  onContinue: () => void;
}

// Uppercases first letter of each word, including after hyphens:
// "cool-season grass" → "Cool-Season Grass"
function toTitleCase(str: string): string {
  return str.replace(/(?:^|[\s-])(\w)/g, (match) => match.toUpperCase());
}

function displayLabel(attr: InferredAttribute): string {
  switch (attr.key) {
    case 'grass_type':
      return toTitleCase(attr.value);
    case 'soil_type':
      return toTitleCase(attr.value);
    case 'hardiness_zone':
      return `USDA Zone ${attr.value}`;
    case 'soil_ph':
      return `Soil pH ${attr.value}`;
    default:
      return `${attr.key}: ${attr.value}`;
  }
}

function sourceLabel(attr: InferredAttribute): string {
  switch (attr.key) {
    case 'grass_type':
      return 'Based on your zone';
    case 'soil_type':
      return 'Regional estimate';
    case 'hardiness_zone':
      return 'From your zip code';
    default:
      return 'Inferred';
  }
}

// Which attributes to show on the profile reveal screen
const DISPLAY_KEYS = ['hardiness_zone', 'grass_type', 'soil_type'] as const;

export default function ProfileScreen({ attributes, attributeContext, onContinue }: ProfileScreenProps) {
  const displayAttrs = attributes
    .filter((a) => (DISPLAY_KEYS as readonly string[]).includes(a.key))
    .sort(
      (a, b) =>
        DISPLAY_KEYS.indexOf(a.key as (typeof DISPLAY_KEYS)[number]) -
        DISPLAY_KEYS.indexOf(b.key as (typeof DISPLAY_KEYS)[number])
    );

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 sm:px-6">
      <div className="w-full max-w-md space-y-8">
        <h1 className="font-heading text-text text-3xl font-normal tracking-tight md:text-[40px]">
          Here&apos;s what we&apos;re starting with for your area.
        </h1>

        <ul className="space-y-4">
          {displayAttrs.map((attr) => (
            <AttributeCard
              key={attr.key}
              label={displayLabel(attr)}
              sublabel={attributeContext?.[attr.key as keyof typeof attributeContext] ?? sourceLabel(attr)}
              bg="bg-white"
            />
          ))}
        </ul>

        <p className="text-muted text-sm">We&apos;ll get more accurate every season.</p>

        <div className="flex justify-center">
          <Button onClick={onContinue} className="rounded-button">
            Go to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
