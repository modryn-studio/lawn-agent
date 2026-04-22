// Reverse geocode lat/lng → { city, state } using Nominatim (OpenStreetMap).
//
// Usage policy: 1 req/sec limit, no bulk/automated use at scale. Fine at current
// user volumes. When volume requires, swap fetch URL to BigDataCloud's free
// server-side endpoint — the interface is identical, under an hour to migrate.
//
// Timeout: 500ms AbortController. Dashboard and proposal routes run this in
// parallel — a slow or down Nominatim must never block the primary render path.
// Callers treat null as "unknown location" and fall back to zone-level copy.

interface NominatimResponse {
  address?: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    'ISO3166-2-lvl4'?: string;
  };
}

export interface GeoLocation {
  city: string;
  state: string;
}

export async function reverseGeocode(
  lat: string | number,
  lng: string | number
): Promise<GeoLocation | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 500);

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Nominatim usage policy requires a descriptive User-Agent
        'User-Agent': 'LawnAgent/1.0 (https://lawnagent.app)',
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as NominatimResponse;

    // city → town → village → county as fallback chain for small/rural areas
    const city =
      data.address?.city ??
      data.address?.town ??
      data.address?.village ??
      data.address?.county ??
      null;
    const state = data.address?.state ?? null;

    if (!city || !state) return null;
    return { city, state };
  } catch {
    // AbortError (timeout) or network failure — both are acceptable, return null
    return null;
  } finally {
    clearTimeout(timer);
  }
}
