# Lawn Agent — Copilot Context

## Who I Am

Luke Hanner builds micro-niche tools with AI. Lawn Agent is a persistent property brain for homeowners who want a great yard but don't know where to start. It monitors conditions, generates proposals, and gets the right product in the user's cart — they approve or pass. Target user: someone who looked at their patchy lawn one Saturday and decided they wanted it to look amazing.

## Deployment

<!-- Filled in by /setup from context.md.
     Read this before touching next.config.ts, BASE_PATH, site.ts, or any hardcoded URL.
     If mode is modryn-app:         basePath must stay set in next.config.ts.
     If mode is standalone-*:       basePath must be absent from next.config.ts. -->

mode: standalone-domain
url: https://lawnagent.app
basePath:

## Stack

- Next.js 16 (App Router) with TypeScript
- Tailwind CSS for styling
- Vercel for deployment
- Vercel Analytics `<Analytics />` in `layout.tsx` — zero-config pageview tracking, no env vars needed
- `@/lib/analytics.ts` — no-op stub with named methods; wire in a real provider here if needed
- `zod` — request body validation in API routes
- `stripe` — installed but not wired yet (subscription billing planned)
- `resend` — transactional email
- `nodemailer` — email delivery
- **Planned (not yet installed):** `@neondatabase/serverless` (Neon Postgres), `@ai-sdk/anthropic` + `ai` (proposal generation via claude-sonnet-4-5), weather/soil API (TBD)

## Project Structure

```
/app                    → Next.js App Router pages
/components             → Reusable UI components
/lib                    → Utilities, helpers, data fetching
/docs                   → Schema design, architecture notes, team deliverables
/migrations             → Neon SQL migration files (schema source of truth)
```

## Route Map

- `/` → Landing page. Hero, value proposition, email capture for early access.
- `/onboarding` → Three screens: address input → first proposal → profile reveal with assumption corrections.
- `/dashboard` → Proposal feed, active recommendations, yard summary.
- `/profile` → Yard details, assumption corrections, treatment log, confidence labels.
- `/proposal/[id]` → Individual proposal detail, approve/pass, commerce deep link, completion confirmation.
- `/api/proposals` → Proposal generation. Pulls yard context, calls Anthropic, returns structured proposal.
- `/api/yard` → Yard properties CRUD. Versioned rows, source + confidence tracking.
- `/api/interactions` → Log user events: confirm, correct, log, approve, pass, complete.
- `/privacy` → Privacy policy
- `/terms` → Terms of service

## Brand & Voice

**Voice:** Short sentences. Direct. No expertise assumed. Confident without arrogance — the product knows things, states them plainly, invites correction without apologizing. Honest about what doesn't exist yet. Never use: "powerful", "seamless", "revolutionary", "unlock", "supercharge", "AI-powered", "next-level", "smart", "intelligent".

**Target User:** Someone who looked at their patchy lawn one Saturday and decided they wanted it to look amazing — and had no idea where to start. They've Googled "when to fertilize my lawn" more than once. They don't want to become a lawn expert. They want a result and a system that makes it almost automatic.

**Visual Rules:**

- Colors: Accent `#4A7C59` (field green), Secondary `#C4A35A` (dry grass gold — use sparingly, tips toward harvest festival at small sizes), Background `#FAF8F4` (warm off-white), Text `#1A1A1A` (near-black), Muted `#9A9590` (warm gray)
- Fonts: Playfair Display (headings) + Inter (body/UI)
- Motion: State change only. Never for delight. No animations on load.
- Avoid: Gradients, pill shapes, decorative shadows, Kelly green (#00A651 — Scotts), corporate blue-green (TruGreen), sage-and-sand (Sunday), leaf/grass/house icons.
- Light mode only. No dark mode toggle.

**Emotional Arc:**

- Land: Recognized. "This is the thing I've been looking for."
- Read: Relieved. "I don't have to figure this out myself."
- Scroll: Convinced. "This actually works the way I want it to."
- Convert: Ready. "Obvious decision."
- Peak never reaches enthusiasm. Clarity and confidence, not excitement.

**Copy Reference:**

- Hero: "Your yard. Figured out."
- Sub-copy: "Stop researching. Stop guessing. Stop starting over every spring."
- CTA: "I want a better yard"
- Error: "Something went wrong. Try again."
- Yard vs. lawn distinction: "Yard" = whole property (emotional). "Lawn" = grass specifically (actionable). Do not collapse.

## README Standard

Every project README follows this exact structure — no more, no less:

```markdown
![Project Name](public/brand/banner.png)

# Project Name

One-line tagline. Outcome-focused — lead with what the user gets, not the technology.

→ [domain.com](https://domain.com)

---

Next.js · TypeScript · Tailwind CSS · Vercel
```

Rules:

- **Banner image** — always first. Path is `public/brand/banner.png`.
- **H1 title** — product name only, no subtitle.
- **Tagline** — one sentence. What the user gets. No buzzwords ("powerful", "seamless", "AI-powered").
- **Live link** — `→ [domain.com](https://domain.com)` format. Always present if live.
- **Divider** — `---` separator before the stack line.
- **Stack line** — `·`-separated list of core tech only. No version numbers, no descriptions.
- **Nothing else.** No install instructions, no contributing section, no architecture diagrams, no screenshots beyond the banner. Real docs go in `/docs` or on the live site.

When adding a badge row (optional, for open source tools/libraries only):

- Place it between the H1 and the tagline
- Use shields.io format: `[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)`
- Keep it to 3 badges max: typically license + CI status + live site
- Apps (not libraries) should skip badges entirely

## Tailwind v4

This project uses Tailwind CSS v4. The rules are different from v3 — follow these exactly.

**Design tokens live in `@theme`, not `:root`:**

```css
/* ✅ correct — generates text-accent, bg-surface, border-border, etc. */
@theme {
  --color-accent: #4a7c59; /* field green — primary actions, links, confirmation */
  --color-secondary: #c4a35a; /* dry grass gold — supporting moments, seasonal cues */
  --color-bg: #faf8f4; /* warm off-white — base background */
  --color-text: #1a1a1a; /* near-black — all primary copy */
  --color-muted: #9a9590; /* warm gray — labels, metadata, secondary info */
  --color-surface: #f0ede8; /* warm panel — card/panel backgrounds */
  --color-border: #e0dcd6; /* warm border — subtle borders */
  --font-heading: var(--font-playfair-display); /* Playfair Display */
}

/* ❌ wrong — :root creates CSS variables but NO utility classes */
:root {
  --color-accent: #4a7c59;
}
```

**Use `(--color-*)` shorthand in class strings — never `[var(--color-*)]`:**

```tsx
// ✅ correct — TW v4 native shorthand
<div className="border-(--color-border) bg-(--color-surface) text-(--color-muted)" />

// ❌ wrong — v3 bracket notation, verbose and unnecessary in v4
<div className="border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)]" />
```

If tokens are defined in `@theme`, you can also use the short utility names directly:

```tsx
// ✅ also correct when @theme is properly set up
<div className="border-border bg-surface text-muted text-accent" />
```

Never add `tailwind.config.*` — v4 has no config file. All theme customization goes in `globals.css` under `@theme`.

## API Route Logging

Every new API route (`app/api/**/route.ts`) MUST use `createRouteLogger` from `@/lib/route-logger`.

```typescript
import { createRouteLogger } from '@/lib/route-logger';
const log = createRouteLogger('my-route');

export async function POST(req: Request): Promise<Response> {
  const ctx = log.begin();
  try {
    log.info(ctx.reqId, 'Request received', {
      /* key fields */
    });
    // ... handler body ...
    return log.end(ctx, Response.json(result), {
      /* key result fields */
    });
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

- `begin()` prints the `─` separator + START line with a 5-char `reqId`
- `info()` / `warn()` log mid-request milestones
- `end()` logs ✅ with elapsed ms and returns the response
- `err()` logs ❌ with elapsed ms
- Never use raw `console.log` in routes — always go through the logger

## Analytics

Vercel Analytics (`<Analytics />` in `layout.tsx`) handles pageviews automatically — no config needed.

`@/lib/analytics.ts` is a no-op stub with named methods. Add a named method for each distinct user action — keeps events typed and discoverable. Wire in a real provider (PostHog, Mixpanel, etc.) inside `analytics.ts` if custom event tracking is needed later.

```typescript
import { analytics } from '@/lib/analytics';
analytics.track('event_name', { prop: value });
```

**Vercel plan check required before adding custom events.** Custom events require Vercel Pro ($20/mo) — they do not appear in the Vercel Analytics dashboard on Hobby. Adding real event calls without an upgraded plan creates dead code that misleads future readers. Before instrumenting scroll depth, click events, conversion tracking, screenshot views, or any custom event: confirm the plan. If on Hobby, keep `analytics.ts` as a no-op stub until the plan is upgraded or a different provider is explicitly wired in. Do not add GA4 or PostHog without explicit instruction — keep it simple.

## Dev Server

Start with `Ctrl+Shift+B` (default build task). This runs:

```
npm run dev -- --port 3000 2>&1 | Tee-Object -FilePath dev.log
```

Tell Copilot **"check logs"** at any point — it reads `dev.log` and flags errors or slow requests.

## Code Style

- Write as a senior engineer: minimal surface area, obvious naming, no abstractions before they're needed
- Comments explain WHY, not what
- One file = one responsibility
- Prefer early returns for error handling
- Never break existing functionality when adding new features
- Leave TODO comments for post-launch polish items

## Core Rules

- Every page earns its place — no pages for businesses not yet running
- Ship fast, stay honest — empty is better than fake
- Ugly is acceptable, broken is not — polish the core action ruthlessly
- Ship one killer feature, not ten mediocre ones
- Instrument analytics before features — data from day one
- Onboard users to value in under 2 minutes
- **Local-first by default** — no accounts, no data stored server-side, pay only when you use it. This is a brand-level commitment across every product, not a feature toggle.

## Positioning Decision: AI

Do NOT lead with "AI" in copy or headlines. The backlash is real and targets AI hype, not useful tools. Lead with outcomes and the user's problem. AI is an implementation detail, not a selling point.

- ✅ "Tools for people who don't have time for bad software"
- ✅ "I did the research so you don't have to"
- ❌ "AI-powered", "AI-first", "built with AI"
  Products use AI internally. The marketing never needs to say so.
