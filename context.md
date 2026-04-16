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
- `@ai-sdk/anthropic` + `ai` — proposal generation via claude-sonnet-4-5 streaming
- `zod` — request body validation in API routes
- Weather/soil temp API — TBD (Open-Meteo or similar, free tier)
- USDA Plant Hardiness Zone API — zip code to hardiness zone lookup

---

## Project Structure Additions

- `/docs` — schema design, architecture notes, Michelle's technical deliverables
- `/migrations` — Neon SQL migration files (schema source of truth)

---

## Route Map

- `/` — Landing page. Hero, value proposition, email capture for early access. No product yet — promise only.
- `/onboarding` — Three screens: address input → first proposal → profile reveal with assumption labels. Address → proposal → correction. Never the reverse.
- `/dashboard` — Main view after onboarding. Proposal feed, active recommendations, yard summary.
- `/profile` — Yard details. Assumption corrections, treatment log, confidence labels per attribute.
- `/proposal/[id]` — Individual proposal. Full detail, approve/pass, deep link to pre-filled cart, completion confirmation.
- `/privacy` — Privacy policy.
- `/terms` — Terms of service.
- `/api/proposals` — Proposal generation endpoint. Pulls confidence-weighted yard context, calls Anthropic, returns structured proposal.
- `/api/yard` — Yard properties CRUD. Versioned rows, source + confidence tracking per Michelle's schema.
- `/api/interactions` — Log user events: confirm, correct, log, approve, pass, complete.

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
- r/frugalmalefashion (skip — wrong audience, listed in error)

Correct list:
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
