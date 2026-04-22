# Lawn Agent — Guide

_Updated April 21, 2026._

---

## What's live

Visit [lawnagent.app](https://lawnagent.app).

The landing page has five sections: hero, an example proposal card, how it works, a human section, and an email capture. Primary CTA goes to onboarding. A sign-in link below the CTA takes returning users to `/signin`.

Onboarding is built end-to-end. After completing onboarding, users land on the dashboard — which shows their current proposal and inferred yard profile. Onboarding is a one-way door: authenticated users with an existing property are redirected to `/dashboard`.

Sign-in and full password reset are live.

---

## Getting started (new user)

1. Go to [lawnagent.app](https://lawnagent.app)
2. Click **I want a better yard**
3. Enter your zip code and see a generated proposal

---

## Returning user sign-in

1. Click **Sign in** on the landing page or go to [lawnagent.app/signin](https://lawnagent.app/signin)
2. Enter email and password
3. Forgot password → `/forgot-password` → enter email → check inbox → `/reset-password?token=…` → set new password

---

## Onboarding flow

1. `/onboarding` — Enter zip code
2. Proposal generated via `/api/onboarding/proposal` (zone lookup + live weather/soil data + Claude)
3. Approve → create account → `/api/onboarding/complete` writes property, yard attributes, and proposal to DB → profile reveal
4. Pass → optional email capture → back to landing page

---

## Dashboard

After onboarding, authenticated users land on `/dashboard`. Shows:

- Current proposal (zone label, title, summary, timing, product suggestion as Amazon search link)
- "I did this" button — marks the proposal `done`, logs a `complete` interaction, flips card to confirmation state
- Yard attributes (hardiness zone, grass type, soil type) with confidence labels — always visible, even after proposal completion

---

## What's not built yet

Individual proposal pages, profile corrections, subscription billing. Auto-generating the next proposal after completion (issue #10). Password reset emails from own domain (issue #11 — v2).

---

## Status

| Feature                                        | Status                 |
| ---------------------------------------------- | ---------------------- |
| Landing page                                   | ✅ Live                |
| Email waitlist                                 | ✅ Live                |
| `/api/waitlist`                                | ✅ Live                |
| Sign-in (`/signin`)                            | ✅ Built               |
| Forgot password (`/forgot-password`)           | ✅ Built               |
| Reset password (`/reset-password`)             | ✅ Built               |
| Onboarding (zip → proposal → signup → profile) | ✅ Built               |
| `/api/onboarding/proposal`                     | ✅ Built               |
| `/api/onboarding/complete`                     | ✅ Built               |
| Auth (`/api/auth/[...path]`)                   | ✅ Built               |
| `/api/yard`                                    | ✅ Built               |
| `/api/interactions`                            | ✅ Built               |
| `/api/proposals`                               | ✅ Built               |
| `/api/proposals/[id]/complete`                 | ✅ Built               |
| Dashboard (proposal + yard profile)            | ✅ Built               |
| Proposal completion loop ("I did this")        | ✅ Built               |
| Commerce link (Amazon search)                  | ✅ Built               |
| Feedback widget                                | ⏳ Built, not wired    |
| Password reset from own domain                 | ⏳ Planned (issue #11) |
| `/proposal/[id]`                               | ❌ Not built           |
| Profile corrections                            | ❌ Not built           |
| Commerce deep links                            | ❌ Not built           |
| Subscription billing                           | ❌ Not built           |
