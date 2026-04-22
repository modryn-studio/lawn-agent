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
- `@neondatabase/serverless` — Neon serverless Postgres (project: `blue-rain-41930180`, `aws-us-east-1`, Postgres 17)
- `@neondatabase/auth@0.2.0-beta.1` — Neon Auth SDK (Better Auth under the hood). Server: `createNeonAuth()` in `src/lib/auth/server.ts`. Client: `createAuthClient()` in `src/lib/auth/client.ts`. Auth proxy at `app/api/auth/[...path]/route.ts`. **Important:** The route uses a `withCanonicalOrigin()` wrapper that rewrites the `Origin` header to `NEXT_PUBLIC_SITE_URL` on every proxied request — this is required because Node.js 22's `fetch` (undici) adds `sec-fetch-mode: cors` headers that cause Neon Auth to reject requests with `INVALID_ORIGIN`. `trusted_origins` is configured in `neon_auth.project_config` in the Neon DB (not in code) — currently set to `["https://lawnagent.app", "https://www.lawnagent.app"]`. `NEXT_PUBLIC_SITE_URL=https://lawnagent.app` must be set in Vercel env vars.
- `@ai-sdk/anthropic` + `ai` — proposal generation via `claude-sonnet-4-6` (AI SDK `generateObject`)
- **phzmapi.org** — USDA zone API (live). `GET https://phzmapi.org/{zip}.json` → `{ zone, temperature_range, coordinates: { lat, lon } }`. Note: field is `lon`, not `lng`.
- **open-meteo.com** — Weather + soil API (live, no API key). Two endpoints: `api.open-meteo.com/v1/forecast` (soil temps at 0cm/6cm hourly, daily precip, `past_days=3`) and `archive-api.open-meteo.com/v1/archive` (historical daily tmax/tmin for GDD). GDD accumulated base 32°F since Feb 15 (`GDD_SEASON_START = '02-15'`). See `src/lib/weather.ts`. Weather failure is non-fatal — proposal continues without weather block.

## Project Structure

```
/app                    → Next.js App Router pages
/components             → Reusable UI components
/lib                    → Utilities, helpers, data fetching
/docs                   → Schema design, architecture notes, team deliverables
/migrations             → Neon SQL migration files (schema source of truth)
```

## Route Map

- `/` → Landing page. Hero (image + copy), Proposal Card (example), How It Works, Human Section, Early Access CTA, Footer. Primary CTA links to `/onboarding`. Sign-in link (`/signin`) below the CTA for returning users.
- `/onboarding` → Five screens: zip input → loading → first proposal (approve/pass) → account creation → profile reveal. State machine in `page-content.tsx`. Data persisted in sessionStorage across auth redirect. Server-side guard: auth'd users with an existing property are redirected to `/dashboard`.
- `/signin` → Returning user sign-in. Server-side guard redirects already-onboarded users to `/dashboard`. Renders `<SigninScreen />`. Links to `/forgot-password` and `/onboarding`.
- `/forgot-password` → Password reset request. Email input → `authClient.requestPasswordReset()` → sends email via Neon shared mail server (`auth@mail.myneon.app`). `redirectTo` points to `/reset-password`.
- `/reset-password` → Password reset completion. Reads `?token=` from URL. Calls `authClient.resetPassword({ newPassword, token })`. Invalid/missing token shows an error state.
- `/dashboard` → Proposal feed, active recommendations, yard summary.
- `/profile` → Yard details, assumption corrections, treatment log, confidence labels.
- `/proposal/[id]` → Individual proposal detail, approve/pass, commerce deep link, completion confirmation.
- `/api/auth/[...path]` → Auth proxy. Forwards all auth requests to Neon Auth server via `auth.handler()`. Wraps each method with `withCanonicalOrigin()` to normalize the `Origin` header before proxying — required workaround for Node.js 22 undici bug. Do not simplify this back to a plain re-export.
- `/api/proposals` → Proposal generation. Pulls yard context, calls Anthropic, returns structured proposal.
- `/api/onboarding/proposal` → Unauthenticated. Zip → zone lookup (phzmapi.org) → attribute inference + weather fetch (Open-Meteo) in parallel → Claude proposal with weather context block injected. Returns `{ ok, proposal, attributes, zone, lat, lng }`.
- `/api/onboarding/complete` → Authenticated. Writes property + yard_properties + proposals rows. Called after signup redirect.
- `/api/yard` → Yard properties CRUD. Versioned rows, source + confidence tracking.
- `/api/interactions` → Log user events: confirm, correct, log, approve, pass, complete.
- `/api/waitlist` → Capture email + optional country + optional zip at onboarding soft wall or Pass. No auth. Upserts on email. `source` distinguishes origin: `'pass'` (proposal passed), `'non_us'` (non-US block, pending), `'onboarding'` (default). Sends Gmail notification to founder on every signup. `zip` stored for seasonal re-engagement (issue #4); uses `COALESCE` on upsert so zip is never overwritten with null.
- `/privacy` → Privacy policy
- `/terms` → Terms of service

## Brand & Voice

**Voice:** Short sentences. Direct. No expertise assumed. Confident without arrogance — the product knows things, states them plainly, invites correction without apologizing. Honest about what doesn't exist yet. Never use: "powerful", "seamless", "revolutionary", "unlock", "supercharge", "AI-powered", "next-level", "smart", "intelligent".

**Target User:** Someone who looked at their patchy lawn one Saturday and decided they wanted it to look amazing — and had no idea where to start. They've Googled "when to fertilize my lawn" more than once. They don't want to become a lawn expert. They want a result and a system that makes it almost automatic.

**Visual Rules:**

- Colors: Accent `#4A7C59` (field green), Secondary `#C4A35A` (dry grass gold — use sparingly, tips toward harvest festival at small sizes), Background `#FAF8F4` (warm off-white), Text `#1A1A1A` (near-black), Muted `#9A9590` (warm gray), Surface `#F0EDE8` (warm panel — page section backgrounds e.g. human-section, NOT proposal or attribute cards), Border `#E8E4DE` (warm border — cards, attribute cards, all card containers)
- Fonts: Playfair Display (headings) + Inter (body/UI)
- Motion: State change only. Never for delight. No animations that run on load.
- Button border radius: 6px (`rounded-button`). Not pill. Set at the **call site** via `className="rounded-button"` — never inside the primitive base class. Card/container border radius: 8px (`rounded-lg`). These two values are distinct and must not be mixed.
- Avoid: Gradients, pill shapes, decorative shadows, Kelly green (#00A651 — Scotts), corporate blue-green (TruGreen), sage-and-sand (Sunday), leaf/grass/house icons.
- Light mode only. No dark mode toggle.

**Emotional Arc:**

- Land: Recognized. "This is the thing I've been looking for."
- Read: Relieved. "I don't have to figure this out myself."
- Scroll: Convinced. "This actually works the way I want it to."
- Convert: Ready. "Obvious decision."
- Peak never reaches enthusiasm. Clarity and confidence, not excitement.

**Typography Scale:**

Playfair Display = `font-heading`. Inter = body/UI default. Playfair is loaded at 400/600/700. Use 700 for the wordmark only. All headings use 400 (regular) — this is the brand's visual signature.

| Element          | Font     | Mobile | Desktop | Weight | Tailwind utilities                                                |
| ---------------- | -------- | ------ | ------- | ------ | ----------------------------------------------------------------- |
| Wordmark         | Playfair | 16px   | 18px    | 700    | `font-heading text-base md:text-lg font-bold`                     |
| H1               | Playfair | 36px   | 56px    | 400    | `font-heading text-4xl md:text-[56px] font-normal tracking-tight` |
| Section heading  | Playfair | 28px   | 40px    | 400    | `font-heading text-3xl md:text-[40px] font-normal tracking-tight` |
| Sub-copy / intro | Inter    | 16px   | 18px    | 400    | `text-base md:text-lg leading-relaxed`                            |
| Body text        | Inter    | 15px   | 16px    | 400    | `text-[15px] sm:text-base leading-relaxed`                        |
| Label / muted    | Inter    | 14px   | 14px    | 400    | `text-sm text-muted`                                              |

All headings: `tracking-tight`. Body/UI: default tracking. Line height: H1 desktop uses `leading-[1.1]`, natural on mobile. Section headings use `leading-[1.15]`. Body copy uses `leading-relaxed` — never `leading-[1.6]` (arbitrary value adds noise). Labels: default (`leading-normal`). Never hardcode hex in `className` — use named token utilities.

**Copy Reference:**

- Hero: "Your yard. Figured out."
- Sub-copy: "Stop researching. Stop guessing. Stop starting over every spring."
- CTA: "I want a better yard"
- Onboarding zip screen: "We'll use this to tell you what your lawn needs."
- Onboarding proposal screen: "Here's what your lawn needs today." / "Approve or pass. That's it."
- Onboarding profile screen: "Here's what we're starting with for your area." / "We'll get more accurate every season."
- Assumption label (medium confidence): "Clay-loam soil — likely for your area"
- Assumption label (confirmed): "Cool-season grass — does that sound right? [Yes / No, change it]"
- Locked attribute: "Soil pH not measured — get a soil test before we recommend amendments"
- Footer: "© {year} Lawn Agent · Privacy · Terms"
- Error: "Something went wrong. Try again."
- Waitlist success: "You're on the list. We'll be in touch."
- Yard vs. lawn distinction: "Yard" = whole property (emotional). "Lawn" = grass specifically (actionable). Do not collapse.

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
  --color-border: #e8e4de; /* warm border — subtle borders */
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
