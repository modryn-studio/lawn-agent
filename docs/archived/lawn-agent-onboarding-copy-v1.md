> **Archived — pre-implementation spec.** Superseded by what shipped. See `brand.md` and the codebase for current truth.

# Lawn Agent — Onboarding Copy

**Version:** 1.0
**Date:** April 15, 2026
**Status:** Cleared by Dieter Rams (register + functional honesty)

---

## Screen 1 — Address

_Your address_
[location icon — tap to use current location]
[text input with autocomplete]

"We'll use this to tell you what your lawn needs."

---

## Screen 2 — First Proposal

"Here's what your lawn needs today."

[Proposal card]

_Approve or pass. That's it._

---

## Screen 3 — Profile Reveal

"Here's what we're starting with for your area."

- **Cool-season grass** — does that sound right? [Yes / No, change it]
- **Clay-loam soil** — likely for your area [Got it]
- **USDA Zone 5b** — based on your address [Got it]

"We'll get more accurate every season."

---

## Copy decisions log

| Screen           | Original                                                                                                                                        | Change                                           | Reason                                                                                                                                                                          | Owner       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Screen 3 header  | "Here's what we know about your yard."                                                                                                          | "Here's what we're starting with for your area." | Original implied yard-specific knowledge the product doesn't have yet — it knows the zone, not the yard. New line is more honest and reinforces the accuracy-over-time promise. | Dieter Rams |
| Screen 2 subtext | "We don't have your treatment history yet — this recommendation assumes a standard schedule for your area. It gets more precise as you use it." | Removed entirely                                 | Apologetic, defensive, undercuts confidence. Product proposes. User decides. The learning is implicit.                                                                          | Luke Hanner |
| Screen 2 subtext | "Approve it, skip it, or tell us we got something wrong. We'll learn either way."                                                               | "Approve or pass. That's it."                    | Previous version was passive — put the burden on the user to manage the relationship. Lawn Agent is an agent. It proposes. Human decides.                                       | Luke Hanner |

---

## Voice notes

**Yard vs. lawn — the distinction is intentional. Do not collapse it.**

- "Yard" — the whole property. The Saturday feeling. The emotional object. The broader promise.
- "Lawn" — the grass specifically. The actionable, specific scope.
- "Lawn Agent knows your yard" — broad promise.
- "Here's what your lawn needs today" — specific action.
- Confirmed by Dieter Rams as doing real work. Leave it.

**Register:** Plain, direct, no expertise assumed. The user is someone who looked at their patchy yard and decided they wanted it to look amazing — and had no idea where to start. The copy meets them there without making them feel behind.

**Confidence without arrogance:** The product is transparent about where it starts (regional inference, not yard-specific knowledge) and honest that it gets smarter over time. That transparency is the confidence signal — not false certainty.

---

## What's not in this copy yet

**Assumption correction flow** — when a user taps "No, change it" on grass type, what happens next? That interaction screen needs copy. Not in scope for v1 onboarding copy — separate deliverable once the interaction UI is designed.

**Error states** — address not found, location permission denied, unsupported region. Copy for edge cases not included here.

**Notification opt-in** — if the product sends proposal alerts, there may be a permissions screen in onboarding. Not scoped yet.
