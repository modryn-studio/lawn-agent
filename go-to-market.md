# Lawn Agent — Go-To-Market Plan

_Written April 23, 2026. V1 MVP complete. Pre-revenue._

---

## Where We Are

- V1 MVP shipped in 7.5 days (April 15 – April 22)
- 1 user in DB (founder test account)
- 2 people through onboarding, no account created
- Reddit outreach active
- Landing page: "First 10 spots. No credit card."

---

## The Sequence

### Phase 1 — First 1-2 Users (now)

**Goal:** Confirm the core loop works for a real person who isn't the founder.

**What ships during this phase:**

- Issue #10 — auto-generate next proposal after "I did this" completion
  - Trigger: first 1-2 non-founder signups
  - Why: without a next proposal, there's nothing to return for. Can't measure retention without it.

**What does NOT ship during this phase:**

- Subscription billing
- Profile corrections
- Individual proposal pages
- Android app
- AppSumo

**Outreach:**

- Continue Reddit warm DMs (r/lawncare, r/homeowners, r/DIY, r/gardening)
- Public replies in high-upvote threads
- Honor "First 10 spots. No credit card." commitment

**Signal to watch:**

- Did they complete onboarding?
- Did they tap "I did this"?
- Did they return after completion?
- What proposal did they receive — is the quality holding across zones?

Log everything in feedback.md.

---

### Phase 2 — First 10 Users

**Goal:** Enough signal to write the business plan and validate the LTD price point.

**Trigger:** 10 real non-founder accounts in the DB.

**What to measure before moving to Phase 3:**

- Completion rate: how many tapped "I did this"
- Return rate: how many came back after completion
- Proposal quality: did recommendations hold across zones (not just Zone 5a)
- Account wall friction: how many stopped at signup after approving proposal
- Commerce link taps: how many clicked "What to buy"

**What ships during this phase (if signal supports it):**

- Android app — only if returning users are logging back in repeatedly. Flutter + Organization account = fast ship.
- Indie Hackers post — the build story. 7.5 days, V1 complete, first users.
- Amazon affiliate links — wire real affiliate URLs for commission on product clicks. Low effort, direct fit.

**What does NOT ship yet:**

- AppSumo
- Subscription billing (Stripe is installed, not wired)

---

### Phase 3 — Flip to Paid (after 10 users)

**Trigger:** 10 real users through the free flow, feedback logged, signal collected.

**Actions:**

1. Remove "First 10 spots. No credit card." from landing page
2. Launch private LTD — $59-100 one-time payment
3. Distribute: Reddit, X, Ship or Die, LTD communities
4. Wire Stripe — Payment Links first, Checkout Sessions only if needed
5. Ask first 10 users for feedback and testimonials
6. Write the Lawn Agent business plan with Charlie — based on real signal, not hypothesis

---

### Phase 4 — AppSumo (after private LTD validates price)

**Goal:** Close AppSumo LTD campaign. Fund content production for 1-2 years.

**Prerequisite:** Private LTD has sold. Price point is validated. Product loop is proven.

**Parallel:**

- Start programmatic SEO — "Zone 5a lawn care plan", "cool season grass spring schedule", "Lawn Agent vs Yard Mastery"
- SEO compounds slowly — start the clock as early as possible

---

## Open Issues (post-MVP)

| Issue | Title                                              | Priority | Trigger                             |
| ----- | -------------------------------------------------- | -------- | ----------------------------------- |
| #10   | Auto-generate next proposal after completion       | P0       | First 1-2 users                     |
| #11   | Password reset from own domain                     | P2       | After Phase 3                       |
| #12   | Capture product used on proposal completion (v2)   | P2       | After Phase 3                       |
| #13   | "Continue as [name]" returning visitor prompt (v2) | P2       | Session expiry becomes churn signal |
| #14   | Rate limit unauthenticated endpoints               | P1       | Before AppSumo                      |
| #15   | Programmatic SEO: zone/grass-type/season pages     | P2       | Month 3+                            |
| —     | Android app                                        | P1       | Return-visit signal from Phase 2    |
| —     | Profile corrections                                | P2       | After Phase 3                       |
| —     | Subscription billing                               | P1       | Phase 3                             |
| —     | Commerce deep links                                | P2       | After Phase 3                       |

---

## Monetization Sequence

1. **Free** — first 10 users. Honor the public commitment.
2. **Private LTD** — $59-100 one-time. Close it permanently after campaign.
3. **Subscription** — $10-15/month. Target state. Wire after LTD closes.
4. **Affiliate** — Amazon affiliate links on product suggestions. Wire in Phase 2.
5. **AppSumo** — after private LTD validates the price and the loop.

---

## Key Decisions Already Made (do not re-litigate)

- Lawn-only wedge, full property brain is the destination
- Three domains within 12 months
- Subscription $10-15/month is the target revenue model
- No free tier — paid users actually use the product (after Phase 1)
- Commerce v1: Amazon search link constructed server-side from product suggestion
- No AI in marketing copy — lead with outcomes
- Android app waits for return-visit signal
- Business plan written after first 10 users, not before

---

## Metrics

See `scripts/funnel.sql` — run in the Neon console for a full health check.
