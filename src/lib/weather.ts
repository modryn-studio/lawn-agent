// Open-Meteo integration: live weather context for proposal generation.
//
// Two calls fire in parallel:
// 1. Forecast API — current soil temp + precip (past 3 / next 3 days)
// 2. Archive API — historical daily min/max for Growing Degree Day accumulation
//
// GDD accumulation is the professional standard for timing lawn treatments.
// We calculate it server-side so Claude reasons from a labeled fact
// ("Pre-emergent window: OPEN") instead of raw numbers.
//
// No caching: weather data needs to be fresh. Add a cache table if volume warrants it.

// ── Constants ─────────────────────────────────────────────────────────────────

// GDD base temperature for cool-season grasses (°F).
// Pre-emergent crabgrass timing window: 250–500 GDD base 32.
const GDD_BASE_F = 32;

// Hardcoded season start for GDD accumulation.
// This is an assumption, not dynamic — revisit annually if growing seasons shift.
const GDD_SEASON_START_MONTH_DAY = '02-15';

// Soil temperature threshold for crabgrass germination (°F).
const CRABGRASS_SOIL_TEMP_F = 55;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WeatherContext {
  soilTemp0cm: number | null; // °F, surface — null if no readings available for this location
  soilTemp6cm: number | null; // °F, 6cm depth — null if no readings available
  precipLast3Days: number; // inches
  precipNext3Days: number; // inches
  gddAccumulated: number; // base 32°F since Feb 15
}

interface ForecastResponse {
  hourly: {
    time: string[];
    soil_temperature_0cm: (number | null)[];
    soil_temperature_6cm: (number | null)[];
  };
  daily: {
    time: string[];
    precipitation_sum: (number | null)[];
  };
}

interface ArchiveResponse {
  daily: {
    time: string[];
    temperature_2m_max: (number | null)[];
    temperature_2m_min: (number | null)[];
  };
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetchWeatherContext(lat: string, lng: string): Promise<WeatherContext> {
  const today = new Date();
  // If today is before Feb 15, the season started last year — avoid an inverted date range.
  const seasonStartThisYear = new Date(today.getFullYear(), 1, 15);
  const startYear = today < seasonStartThisYear ? today.getFullYear() - 1 : today.getFullYear();
  const startDate = `${startYear}-${GDD_SEASON_START_MONTH_DAY}`;
  const endDate = today.toISOString().slice(0, 10);

  const forecastUrl =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lng}` +
    `&hourly=soil_temperature_0cm,soil_temperature_6cm` +
    `&daily=precipitation_sum` +
    `&temperature_unit=fahrenheit` +
    `&precipitation_unit=inch` +
    `&timezone=auto` +
    `&past_days=3&forecast_days=7`;

  const archiveUrl =
    `https://archive-api.open-meteo.com/v1/archive` +
    `?latitude=${lat}&longitude=${lng}` +
    `&daily=temperature_2m_max,temperature_2m_min` +
    `&temperature_unit=fahrenheit` +
    `&timezone=auto` +
    `&start_date=${startDate}&end_date=${endDate}`;

  const [forecastRes, archiveRes] = await Promise.all([fetch(forecastUrl), fetch(archiveUrl)]);

  if (!forecastRes.ok) throw new Error(`Open-Meteo forecast returned ${forecastRes.status}`);
  if (!archiveRes.ok) throw new Error(`Open-Meteo archive returned ${archiveRes.status}`);

  const forecast = (await forecastRes.json()) as ForecastResponse;
  const archive = (await archiveRes.json()) as ArchiveResponse;

  // Most recent non-null hourly soil temps (array is chronological, walk backwards).
  const soilTemp0cm = latestNonNull(forecast.hourly.soil_temperature_0cm);
  const soilTemp6cm = latestNonNull(forecast.hourly.soil_temperature_6cm);

  // Daily array layout with past_days=3, forecast_days=7:
  // [d-3, d-2, d-1, today, d+1, d+2, d+3, d+4, d+5, d+6]
  // Past 3 days: indices 0–2. Next 3 days: indices 4–6 (skip today to avoid double-counting).
  const dailyPrecip = forecast.daily.precipitation_sum;
  const precipLast3Days = sumRange(dailyPrecip, 0, 3);
  const precipNext3Days = sumRange(dailyPrecip, 4, 7);

  // GDD = sum of max(0, (tmax + tmin) / 2 - base) across all days since Feb 15.
  const tmax = archive.daily.temperature_2m_max;
  const tmin = archive.daily.temperature_2m_min;
  let gddAccumulated = 0;
  for (let i = 0; i < tmax.length; i++) {
    const hi = tmax[i];
    const lo = tmin[i];
    if (hi == null || lo == null) continue;
    const daily = Math.max(0, (hi + lo) / 2 - GDD_BASE_F);
    gddAccumulated += daily;
  }

  return {
    soilTemp0cm,
    soilTemp6cm,
    precipLast3Days,
    precipNext3Days,
    gddAccumulated: Math.round(gddAccumulated),
  };
}

// ── Serialize ─────────────────────────────────────────────────────────────────

export function serializeWeatherContext(ctx: WeatherContext): string {
  const gddWindow = gddWindowLabel(ctx.gddAccumulated);

  const soilTempLine =
    ctx.soilTemp0cm != null && ctx.soilTemp6cm != null
      ? `- Soil temperature: ${ctx.soilTemp0cm.toFixed(0)}°F surface, ${ctx.soilTemp6cm.toFixed(0)}°F at 6cm depth`
      : '- Soil temperature: unavailable for this location';

  const germination =
    ctx.soilTemp0cm == null
      ? 'UNKNOWN'
      : ctx.soilTemp0cm >= CRABGRASS_SOIL_TEMP_F
        ? 'TRIGGERED'
        : 'NOT YET TRIGGERED';

  return [
    'LIVE WEATHER CONDITIONS (Open-Meteo, use these as facts):',
    soilTempLine,
    `- Rain last 3 days: ${ctx.precipLast3Days.toFixed(2)} in`,
    `- Rain forecast next 3 days: ${ctx.precipNext3Days.toFixed(2)} in`,
    `- Pre-emergent window: ${gddWindow} (${ctx.gddAccumulated} GDD accumulated base 32°F since Feb 15; crabgrass window is 250–500 GDD)`,
    `- Crabgrass germination (soil > ${CRABGRASS_SOIL_TEMP_F}°F): ${germination}`,
    '',
  ].join('\n');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function latestNonNull(values: (number | null)[]): number | null {
  for (let i = values.length - 1; i >= 0; i--) {
    const v = values[i];
    if (v != null) return v;
  }
  return null; // Some locations (coastal, high-altitude) have no soil monitoring
}

function sumRange(values: (number | null)[], start: number, end: number): number {
  let total = 0;
  for (let i = start; i < end && i < values.length; i++) {
    const v = values[i];
    if (v != null) total += v;
  }
  return total;
}

function gddWindowLabel(gdd: number): 'APPROACHING' | 'OPEN' | 'CLOSED' {
  if (gdd < 250) return 'APPROACHING';
  if (gdd <= 500) return 'OPEN';
  return 'CLOSED';
}
