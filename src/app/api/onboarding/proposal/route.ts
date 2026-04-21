import { createRouteLogger } from '@/lib/route-logger';
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

    const { zone, coordinates } = zoneData;
    const lat = String(coordinates.lat);
    const lng = String(coordinates.lon);

    log.info(ctx.reqId, 'Zone resolved', { zone, lat, lng });

    // Infer yard attributes from zone
    const inferred = inferAttributesFromZone(zone, lat, lng);
    const attrs = inferred.map(toAttributeContext);
    const contextBlock = buildContextBlockFromAttributes(attrs);
    const yardContext = serializeContextBlock(`onboarding-${zip}`, contextBlock);

    log.info(ctx.reqId, 'Context built from inference', {
      total: contextBlock.totalAttributes,
      maturity: contextBlock.dataMaturity,
      attributes: attrs.map((a) => `${a.key}=${a.value}`),
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
      promptChars: yardContext.length,
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
      system: buildSystemPrompt(),
      prompt: yardContext,
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
      promptLength: yardContext.length,
    });

    return log.end(
      ctx,
      Response.json({
        ok: true,
        proposal,
        attributes: inferred,
        zone,
        lat,
        lng,
      })
    );
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
