# Lawn Agent — Guide

_Updated April 21, 2026._

---

## What's live

Visit [lawnagent.app](https://lawnagent.app).

The landing page has five sections: hero, an example proposal card, how it works, a human section, and an email capture. Both CTAs go directly to onboarding.

Onboarding is built end-to-end. After completing onboarding, users land on the dashboard — which shows their current proposal and inferred yard profile.

---

## Getting started

1. Go to [lawnagent.app](https://lawnagent.app)
2. Click **I want a better yard**
3. Enter your zip code and see a generated proposal

---

## Onboarding flow

1. `/onboarding` — Enter zip code
2. Proposal generated via `/api/onboarding/proposal` (zone lookup + live weather/soil data + Claude)
3. Approve → create account → `/api/onboarding/complete` writes property, yard attributes, and proposal to DB → profile reveal
4. Pass → optional email capture → back to landing page

---

## Dashboard

After onboarding, authenticated users land on `/dashboard`. Shows:

- Current proposal (zone label, title, summary, timing, product suggestion)
- Three yard attributes (hardiness zone, grass type, soil type) with confidence labels

---

## What's not built yet

Individual proposal pages, profile corrections, commerce deep links, subscription billing.

---

## Status

| Feature                                        | Status              |
| ---------------------------------------------- | ------------------- |
| Landing page                                   | ✅ Live             |
| Email waitlist                                 | ✅ Live             |
| `/api/waitlist`                                | ✅ Live             |
| Onboarding (zip → proposal → signup → profile) | ✅ Built            |
| `/api/onboarding/proposal`                     | ✅ Built            |
| `/api/onboarding/complete`                     | ✅ Built            |
| Auth (`/api/auth/[...path]`)                   | ✅ Built            |
| `/api/yard`                                    | ✅ Built            |
| `/api/interactions`                            | ✅ Built            |
| `/api/proposals`                               | ✅ Built            |
| Dashboard (proposal + yard profile)            | ✅ Built            |
| Feedback widget                                | ⏳ Built, not wired |
| `/proposal/[id]`                               | ❌ Not built        |
| Profile corrections                            | ❌ Not built        |
| Commerce deep links                            | ❌ Not built        |
| Subscription billing                           | ❌ Not built        |
