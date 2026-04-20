'use client';

import { Button } from '@/components/ui/button';
import type { InferredAttribute } from '@/lib/yard-inference';

interface ProfileScreenProps {
  attributes: InferredAttribute[];
  onContinue: () => void;
}

function displayLabel(attr: InferredAttribute): string {
  const val = attr.value.charAt(0).toUpperCase() + attr.value.slice(1);
  switch (attr.key) {
    case 'grass_type':
      return val;
    case 'soil_type':
      return val;
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
const DISPLAY_KEYS = ['grass_type', 'soil_type', 'hardiness_zone'] as const;

export default function ProfileScreen({ attributes, onContinue }: ProfileScreenProps) {
  const displayAttrs = attributes.filter((a) =>
    (DISPLAY_KEYS as readonly string[]).includes(a.key)
  );

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 sm:px-6">
      <div className="w-full max-w-md space-y-8">
        <h1 className="font-heading text-text text-3xl font-normal tracking-tight md:text-[40px]">
          Here&apos;s what we&apos;re starting with for your area.
        </h1>

        <ul className="space-y-4">
          {displayAttrs.map((attr) => (
            <li key={attr.key} className="border-border rounded-lg border bg-white px-5 py-4">
              <p className="text-text text-[15px] leading-relaxed">{displayLabel(attr)}</p>
              <p className="text-muted mt-1 text-xs">{sourceLabel(attr)}</p>
            </li>
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
