import { createRouteLogger } from '@/lib/route-logger';
import { sql } from '@/lib/db';
import { env } from '@/lib/env';
import { generateObject } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import {
  proposalSchema,
  buildContextBlockFromAttributes,
  serializeContextBlock,
  buildSystemPrompt,
} from '@/lib/proposals';
import { inferAttributesFromZone, toAttributeContext } from '@/lib/yard-inference';
import { fetchWeatherContext, serializeWeatherContext } from '@/lib/weather';
import { reverseGeocode } from '@/lib/geocode';

const log = createRouteLogger('onboarding-proposal');

const anthropicClient = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY });

const bodySchema = z.object({
  zip: z.string().regex(/^\d{5}$/, 'Must be a 5-digit US zip code'),
});

// USDA Plant Hardiness Zone API response shape
interface PhzmapiResponse {
  zone: string;
  temperature_range: string;
  coordinates: { lat: number; lon: number };
}

export async function POST(req: Request): Promise<Response> {
  const ctx = log.begin();

  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return log.end(
        ctx,
        Response.json({ error: 'Invalid zip code', issues: parsed.error.issues }, { status: 400 })
      );
    }

    const { zip } = parsed.data;
    log.info(ctx.reqId, 'Onboarding proposal requested', { zip });

    // Resolve USDA hardiness zone from zip
    let zoneData: PhzmapiResponse;
    const zoneStart = Date.now();
    try {
      const res = await fetch(`https://phzmapi.org/${zip}.json`);
      if (!res.ok) {
        log.warn(ctx.reqId, 'USDA API returned non-OK', { status: res.status });
        return log.end(
          ctx,
          Response.json(
            { error: 'Could not look up your area. Check the zip code and try again.' },
            { status: 422 }
          )
        );
      }
      zoneData = (await res.json()) as PhzmapiResponse;
    } catch (error) {
      log.warn(ctx.reqId, 'USDA API unreachable', { error });
      return log.end(
        ctx,
        Response.json(
          { error: 'Zone lookup service is temporarily unavailable. Try again in a moment.' },
          { status: 503 }
        )
      );
    }
    const zoneMs = Date.now() - zoneStart;

    // Validate the shape before deep access — phzmapi.org returns 200 for edge cases
    // with missing or malformed coordinates, and the cast above doesn't protect us.
    if (!zoneData?.zone || !zoneData?.coordinates?.lat || !zoneData?.coordinates?.lon) {
      log.warn(ctx.reqId, 'USDA API returned unexpected shape', { body: zoneData });
      return log.end(
        ctx,
        Response.json(
          { error: 'Could not look up your area. Check the zip code and try again.' },
          { status: 422 }
        )
      );
    }

    const { zone, coordinates } = zoneData;
    const lat = String(coordinates.lat);
    const lng = String(coordinates.lon);

    log.info(ctx.reqId, 'Zone resolved', { zone, lat, lng, zoneMs });

    // Fetch weather in parallel with (synchronous) attribute inference.
    // Weather failure is non-fatal — we warn and fall back to a weather-less prompt.
    const weatherStart = Date.now();
    const [inferred, weatherCtx, geoLocation] = await Promise.all([
      Promise.resolve(inferAttributesFromZone(zone, lat, lng)),
      fetchWeatherContext(lat, lng).catch((error) => {
        log.warn(ctx.reqId, 'Weather fetch failed, continuing without weather block', { error });
        return null;
      }),
      reverseGeocode(lat, lng).catch(() => null),
    ]);
    const weatherMs = Date.now() - weatherStart;

    const attrs = inferred.map(toAttributeContext);
    const contextBlock = buildContextBlockFromAttributes(attrs);
    const yardContext = serializeContextBlock(`onboarding-${zip}`, contextBlock);
    const weatherBlock = weatherCtx ? serializeWeatherContext(weatherCtx) : '';
    const locationBlock = geoLocation ? `LOCATION: ${geoLocation.city}, ${geoLocation.state}` : '';
    const finalPrompt = [locationBlock, yardContext, weatherBlock].filter(Boolean).join('\n');

    log.info(ctx.reqId, 'Context built from inference', {
      total: contextBlock.totalAttributes,
      maturity: contextBlock.dataMaturity,
      attributes: attrs.map((a) => `${a.key}=${a.value}`),
      weatherMs,
      weather: weatherCtx
        ? {
            soilTemp0cm: weatherCtx.soilTemp0cm,
            soilTemp6cm: weatherCtx.soilTemp6cm,
            precipLast3Days: Number(weatherCtx.precipLast3Days.toFixed(2)),
            precipNext3Days: Number(weatherCtx.precipNext3Days.toFixed(2)),
            gddAccumulated: weatherCtx.gddAccumulated,
          }
        : null,
    });

    // Generate proposal via Claude — same schema and system prompt as authenticated endpoint.
    // This is a real proposal, not a degraded preview.
    const systemDate = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    log.info(ctx.reqId, 'Calling Claude', {
      model: 'claude-sonnet-4-6',
      systemDate,
      promptChars: finalPrompt.length,
    });

    const claudeStart = Date.now();
    const {
      object: proposal,
      usage,
      warnings,
      finishReason,
    } = await generateObject({
      model: anthropicClient('claude-sonnet-4-6'),
      schema: proposalSchema,
      system: buildSystemPrompt(systemDate),
      prompt: finalPrompt,
    });
    const claudeMs = Date.now() - claudeStart;

    // claude-sonnet-4-6 pricing: $3/M input tokens, $15/M output tokens
    const inputCost = ((usage?.inputTokens ?? 0) / 1_000_000) * 3;
    const outputCost = ((usage?.outputTokens ?? 0) / 1_000_000) * 15;
    const totalCost = inputCost + outputCost;

    log.info(ctx.reqId, 'Proposal generated', {
      title: proposal.title,
      category: proposal.category,
      finishReason,
      claudeMs,
      tokens: {
        input: usage?.inputTokens,
        output: usage?.outputTokens,
        total: usage?.totalTokens,
      },
      costUsd: {
        input: inputCost.toFixed(6),
        output: outputCost.toFixed(6),
        total: totalCost.toFixed(6),
      },
      warnings: warnings?.length ? warnings : undefined,
      promptChars: finalPrompt.length,
    });

    // Log anonymous telemetry — non-fatal. Failure never blocks the proposal response.
    let telemetryId: string | null = null;
    try {
      const [row] = await sql`
        INSERT INTO proposal_telemetry (zip, climate_zone, proposal_category, proposal_title)
        VALUES (${zip}, ${zone}, ${proposal.category}, ${proposal.title})
        RETURNING id
      `;
      telemetryId = row.id as string;
      log.info(ctx.reqId, 'Telemetry row written', { telemetryId });
    } catch (telemetryError) {
      log.warn(ctx.reqId, 'Telemetry insert failed (non-fatal)', { error: telemetryError });
    }

    return log.end(
      ctx,
      Response.json({
        ok: true,
        proposal,
        attributes: inferred,
        zone,
        lat,
        lng,
        telemetryId,
      })
    );
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
