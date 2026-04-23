# Lawn Agent — User Feedback Log

_Updated after each user interaction. Add entries chronologically. Patterns reviewed at 10 entries._

---

## Entries

### Reddit1124 — April 23, 2026

Source: Reddit DM (r/lawncare — tracking thread)
Zone: Unknown
Stopped at: Engaged but skeptical — asked clarifying questions before trying
Quote: "How would an app monitor my entire lawn? What is it monitoring for? Weed identification? Soil nutrient deficiencies? Compaction issues?"
Signal: "Monitor" is being read as physical sensor surveillance, not weather/zone data. Trust gap at the concept level before they even try the product.
Watch for: Other users with the same misconception. May need landing page copy adjustment if this pattern repeats.
Response sent: Clarified what monitoring actually means — zone, soil temps, weather. Corrected the expectation honestly. Ended with soft CTA.

---

### theJMAN1016 — April 23, 2026

Source: Reddit DM (r/lawncare — tracking thread)
Zone: Unknown — never signed up
Stopped at: Looked at the app briefly, did not create account
Quote: "I do not like the products it suggests. It also seems to be for someone who is a novice and knows nothing. The first recommendation it gave is to apply nitrogen fertilizer for a quick green up in april. This is basic knowledge."
Signal: Enthusiast user — already knows his turf, has strong product preferences (10-10-10 vs 32-0-4), uses a calendar for logging not guidance. Not our user. His "basic knowledge" complaint confirms correct positioning. This is Yard Mastery's user, not ours. Loud ≠ right.
Watch for: Do not chase enthusiast users. If this pattern repeats, it validates novice positioning — not a product quality problem.
Weather accuracy concern: Verified against live Open-Meteo data. Soil temps accurate (47.5°F surface, 52.1°F at 6cm). GDD 700 explained by anomalously warm days (75°F, 72°F on April 21–22). Data is real. His concern was about weather apps in general — he never saw Lawn Agent's weather data.
Response sent: Thanked him, acknowledged the product is for novices, closed the conversation.

---

### callmemom — April 23, 2026

Source: Reddit DM (r/lawncare — "So overwhelmed" thread)
Zone: Unknown — Indiana area based on thread context
Stopped at: Account creation screen — after approving proposal
Quote: "Love it. I stopped at create account because I know where to buy (actually already purchased)"
Signal: Proposal was credible and actionable — she either acted on it or it matched what she was already planning. Account wall created friction for a user who had already received value. Product is working. Account motivation is the gap.
Watch for: Pattern of users stopping at account creation after approving proposal. If 3+ users stop here, revisit signup copy or consider what additional value is shown at the account screen. Current copy: "Next: what to buy and where to get it." First A/B test hypothesis when traffic warrants: account creation copy.
Response sent: Validated her response, offered low-pressure path back to account creation, asked what the product recommended.
Follow up needed: Did she respond with what proposal she received? Log when available.

---

## Patterns (review at 10 entries)

_Not enough data yet._

---

## Open Questions

1. **"Monitor" misconception** — does landing page copy need to be more explicit about what the product actually monitors? Reddit1124 read it as physical sensors. One data point — watch for recurrence.
2. **Account wall friction** — callmemom stopped at account creation after getting value. Is the value prop at the signup screen strong enough? Current copy: "Next: what to buy and where to get it." First A/B hypothesis when traffic warrants.
3. **Proposal quality across zones** — all verified proposals so far are Zone 5a. Need feedback from other zones before scaling outreach.

---

## Proposal Quality Verified

| Zip   | Zone | Proposal                                         | Product                        | Weather Data                                       | Verdict                                                                                                       |
| ----- | ---- | ------------------------------------------------ | ------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 53901 | 5a   | Apply Quick-Release Nitrogen for Spring Green-Up | Jonathan Green Green-Up 29-0-3 | soilTemp0cm: 47.5°F, soilTemp6cm: 52.1°F, GDD: 700 | Defensible. Timing correct. GDD high due to warm anomaly (Apr 21–22). Pre-emergent correctly not recommended. |

_Going forward, full proposal content is captured automatically in `proposal_telemetry`. This table is for manual spot-checks._

---

## Funnel

See `scripts/funnel.sql` — run in the Neon console for a full health check.
