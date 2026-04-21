# Project Context

## Core Framework

Market: Homeowners who care about their lawn and yard but lack the knowledge and system to act on it consistently.

Reference product (what people pay for): Yard Mastery app — 100K+ users, free, personalized lawn plans by zip code and grass type. Top complaint: feels like a product marketing tool, not a trusted advisor. Users know they're being sold to.

Your angle: Agentic. The product monitors conditions, generates proposals, and gets the right product to the user's cart — they approve or pass. It doesn't wait to be asked. Every competitor waits to be asked.

---

## Product

Lawn Agent is a persistent property brain for homeowners who do it themselves. It knows your yard, monitors weather and soil conditions, and tells you exactly what your lawn needs — then gets the right product in your cart with one tap. It gets smarter every season.

---

## Target User

Someone who looked at their patchy lawn one Saturday and decided they wanted it to look amazing — and had no idea where to start. Not a lawn enthusiast. Not a professional. Someone who wants the result without becoming an expert. They've Googled "when to fertilize my lawn" more than once. They're done starting from scratch every spring.

---

## Deployment

mode: standalone-domain

modrynstudio.com has a verified **Domain property** in Google Search Console. Lawn Agent is a standalone domain — submit lawnagent.app sitemap directly to GSC as a separate URL Prefix property.

url: https://lawnagent.app
basePath:

---

## Minimum Money Loop

Landing page → email capture (early access) → onboarding (address input) → first proposal generated → user approves → deep link to pre-filled Amazon/Home Depot cart → user completes purchase outside app → user confirms completion in app → proposal marked done → app logs treatment history → next proposal gets smarter.

---

## Stack Additions

- `@neondatabase/serverless` — Neon serverless Postgres (yard_properties, property_interactions, proposals tables per Michelle's schema)
- `@neondatabase/auth@0.2.0-beta.1` — Neon Auth SDK (Better Auth). Server: `createNeonAuth()` in `src/lib/auth/server.ts`. Client: `createAuthClient()` in `src/lib/auth/client.ts`. Auth proxy at `app/api/auth/[...path]/route.ts` uses a `withCanonicalOrigin()` wrapper — do not remove it (Node.js 22 undici bug workaround). `trusted_origins` lives in `neon_auth.project_config` in the DB. `NEXT_PUBLIC_SITE_URL=https://lawnagent.app` required in Vercel env.
- `@ai-sdk/anthropic` + `ai` — proposal generation via claude-sonnet-4-6 (generateObject)
- `zod` — request body validation in API routes
- phzmapi.org — USDA zone API (live). `GET https://phzmapi.org/{zip}.json` → `{ zone, temperature_range, coordinates: { lat, lon } }`
- open-meteo.com — Weather + soil API (live, no API key). Forecast: `api.open-meteo.com/v1/forecast` (soil temps 0cm/6cm hourly, daily precip, `past_days=3`). Archive: `archive-api.open-meteo.com/v1/archive` (historical daily tmax/tmin for GDD since Feb 15). See `src/lib/weather.ts`.

---

## Project Structure Additions

- `/docs` — schema design, architecture notes, Michelle's technical deliverables
- `/migrations` — Neon SQL migration files (schema source of truth)

---

## Route Map

- `/` — Landing page. Hero (image + copy), Proposal Card (example), How It Works, Human Section, Early Access CTA, Footer. Both CTAs link to `/onboarding`. No authenticated product yet.
- `/onboarding` — Five screens: zip input → loading → first proposal (approve/pass) → account creation → profile reveal. State persisted in sessionStorage across auth redirect.
- `/api/onboarding/proposal` — Unauthenticated. Zip → zone lookup (phzmapi.org) → attribute inference + weather fetch (Open-Meteo, parallel) → Claude proposal with weather context injected.
- `/api/onboarding/complete` — Authenticated. Writes property + yard_properties + proposals rows.
- `/dashboard` — Main view after onboarding. Proposal feed, active recommendations, yard summary.
- `/profile` — Yard details. Assumption corrections, treatment log, confidence labels per attribute.
- `/proposal/[id]` — Individual proposal. Full detail, approve/pass, deep link to pre-filled cart, completion confirmation.
- `/privacy` — Privacy policy.
- `/terms` — Terms of service.
- `/api/auth/[...path]` — Auth proxy. Forwards requests to Neon Auth via `withCanonicalOrigin()` wrapper. Do not simplify to a plain re-export.
- `/api/proposals` — Proposal generation endpoint. Pulls confidence-weighted yard context, calls Anthropic, returns structured proposal.
- `/api/yard` — Yard properties CRUD. Versioned rows, source + confidence tracking per Michelle's schema.
- `/api/interactions` — Log user events: confirm, correct, log, approve, pass, complete.
- `/api/waitlist` — Capture email + optional country + optional zip at onboarding soft wall or Pass. No auth. Upserts on email. `source` distinguishes origin: `'pass'` (proposal passed), `'non_us'` (non-US block, pending), `'onboarding'` (default). Sends Gmail notification to founder on every signup. `zip` stored for seasonal re-engagement; uses `COALESCE` on upsert so zip is never overwritten with null.

---

## Monetization

Subscription — $10–15/month. Affiliate margin on commerce deep links is upside, not the business model. Do not build around affiliate rates we don't control.

Email capture on landing page before subscription is live. Early access list. No free tier — paid users actually use the product.

LTD launch planned via private offer then AppSumo. $59–$100 one-time. LTD funds content and buys time. MRR is the destination.

---

## Target Subreddits

- r/lawncare
- r/homeowners
- r/DIY
- r/gardening

---

## Social Profiles

- X/Twitter: https://x.com/lukehanner
- GitHub: https://github.com/modryn-studio/lawn-agent
- Dev.to: https://dev.to/lukehanner
- Ship or Die: https://shipordie.club/lukehanner
