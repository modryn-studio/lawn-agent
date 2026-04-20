# Lawn Agent — Guide

_Updated April 20, 2026._

---

## What's live

Visit [lawnagent.app](https://lawnagent.app).

The landing page has five sections: hero, an example proposal card, how it works, a human section, and a second email capture. No login. No dashboard.

Onboarding is built. Users can enter their zip code, see a generated proposal, create an account, and land on a profile reveal screen. The dashboard route exists but has no content yet.

---

## Signing up for early access

Two places on the page to sign up — the hero at the top and the early access section at the bottom.

1. Go to [lawnagent.app](https://lawnagent.app)
2. Type your email into the field
3. Click **I want a better yard**
4. You see: "You're on the list. We'll be in touch."

If it fails: "Something went wrong. Try again." appears. Try again.

---

## Onboarding flow

1. `/onboarding` — Enter zip code
2. Proposal generated via `/api/onboarding/proposal` (zone lookup + Claude)
3. Approve → create account via BetterAuth → `/api/onboarding/complete` writes property, yard attributes, and proposal to DB → brief confirmation ("Your proposal is saved.") → profile reveal
4. Pass → optional email capture → back to landing page

---

## What's not built yet

Dashboard, individual proposal pages, profile corrections, commerce deep links, subscription billing.

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
| Feedback widget                                | ⏳ Built, not wired |
| Dashboard                                      | ❌ Not built        |
| `/proposal/[id]`                               | ❌ Not built        |
| Profile corrections                            | ❌ Not built        |
| Commerce deep links                            | ❌ Not built        |
| Subscription billing                           | ❌ Not built        |
