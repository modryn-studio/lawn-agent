import type { AttributeContext } from '@/lib/proposals';

// Zone-based attribute inference for onboarding.
// Uses USDA hardiness zone to infer grass type, soil, and climate attributes
// with low confidence — these are starting assumptions, not facts.

export interface InferredAttribute {
  key: string;
  value: string;
  unit: string | null;
  confidence: number;
  label: string;
  source: string;
  isLocked: boolean;
}

function grassTypeFromZone(zone: string): string {
  const num = parseInt(zone, 10);
  if (isNaN(num)) return 'cool-season grass';
  if (num <= 6) return 'cool-season grass';
  if (num >= 8) return 'warm-season grass';
  return 'transition zone — cool or warm-season grass';
}

export function inferAttributesFromZone(
  zone: string,
  lat: string,
  lng: string
): InferredAttribute[] {
  return [
    {
      key: 'hardiness_zone',
      value: zone,
      unit: null,
      confidence: 0.95,
      label: 'inferred',
      source: 'usda_api',
      isLocked: false,
    },
    {
      key: 'grass_type',
      value: grassTypeFromZone(zone),
      unit: null,
      confidence: 0.5,
      label: 'assumed',
      source: 'regional_inference',
      isLocked: false,
    },
    {
      key: 'soil_type',
      value: 'loam',
      unit: null,
      confidence: 0.3,
      label: 'assumed',
      source: 'regional_inference',
      isLocked: false,
    },
    {
      key: 'soil_ph',
      value: '',
      unit: 'pH',
      confidence: 0,
      label: 'assumed',
      source: 'regional_inference',
      isLocked: true,
    },
    {
      key: 'latitude',
      value: lat,
      unit: null,
      confidence: 0.95,
      label: 'inferred',
      source: 'usda_api',
      isLocked: false,
    },
    {
      key: 'longitude',
      value: lng,
      unit: null,
      confidence: 0.95,
      label: 'inferred',
      source: 'usda_api',
      isLocked: false,
    },
  ];
}

/** Convert InferredAttribute to AttributeContext (adds interactionCount: 0) */
export function toAttributeContext(attr: InferredAttribute): AttributeContext {
  return { ...attr, interactionCount: 0 };
}
