# Brand

## Voice

- Short sentences. Direct. No expertise assumed. The user is not a lawn enthusiast — meet them where they are.
- Confident without arrogance. The product knows things. It states them plainly. It invites correction without apologizing for its assumptions.
- Honest about what doesn't exist yet. Never promise fulfillment the product doesn't deliver. Never claim certainty the data doesn't support.
- Never use: "powerful", "seamless", "revolutionary", "unlock", "supercharge", "AI-powered", "next-level", "smart", "intelligent"

---

## The User

Someone who looked at their patchy lawn on a Saturday and decided they wanted it to look amazing — and had no idea where to start. They've Googled "when to fertilize my lawn" more than once. They don't want to become a lawn expert. They want a result and a system that makes it almost automatic. They are done starting from scratch every spring.

---

## Visual Rules

- Color mode: Light mode only. No dark mode toggle.
- Fonts: Playfair Display (headings) + Inter (body/UI)
- Motion: State change only. Never for delight. No animations that run on load.
- Button border radius: 6px (`rounded-button`). Not pill. Applied consistently across all buttons and inputs.
- Avoid: Gradients, pill shapes, decorative shadows, Kelly green (`#00A651` territory), corporate blue-green (TruGreen territory), sage-and-sand palette (Sunday territory), leaf icons, grass icons, house icons — fully commoditized in this category.

---

## Color System

| Name       | Hex       | Role                                                                                                                 |
| ---------- | --------- | -------------------------------------------------------------------------------------------------------------------- |
| Accent     | `#4A7C59` | Field green. Primary actions, links, confirmation states. Not Kelly green.                                           |
| Secondary  | `#C4A35A` | Dry grass gold. Supporting moments, seasonal cues. Use sparingly — at small sizes it tips toward "harvest festival". |
| Background | `#FAF8F4` | Warm off-white. Never pure white.                                                                                    |
| Text       | `#1A1A1A` | Near-black. All primary copy.                                                                                        |
| Muted      | `#9A9590` | Warm gray. Labels, metadata, secondary information.                                                                  |
| Surface    | `#F0EDE8` | Warm panel. Card and panel backgrounds.                                                                              |
| Border     | `#E8E4DE` | Warm border. Proposal cards, attribute cards, all card containers. Dieter spec.                                      |

Color rules:

- Scotts owns Kelly green (`#00A651`) — avoid entirely.
- TruGreen owns corporate blue-green — avoid entirely.
- Sunday owns sage-and-sand — avoid entirely.
- No pure black, no pure white, no cool grays, no gradients.

---

## Typography Scale

Playfair Display is the heading font (`font-heading` utility). Inter is the body/UI font (default, applied globally via `font-body` on `<body>`). Both are loaded in `layout.tsx`.

Playfair is loaded at weights `400`, `600`, `700`. Use **700** for the wordmark only. Use **400** (regular) for all headings — Playfair at regular weight is the brand's visual signature. Weight 600 is loaded but intentionally unused at launch.

| Element          | Font             | Mobile | Desktop | Weight | Tailwind utilities                                                |
| ---------------- | ---------------- | ------ | ------- | ------ | ----------------------------------------------------------------- |
| Wordmark         | Playfair Display | 16px   | 18px    | 700    | `font-heading text-base md:text-lg font-bold`                     |
| H1               | Playfair Display | 36px   | 56px    | 400    | `font-heading text-4xl md:text-[56px] font-normal tracking-tight` |
| Section heading  | Playfair Display | 28px   | 40px    | 400    | `font-heading text-3xl md:text-[40px] font-normal tracking-tight` |
| Sub-copy / intro | Inter            | 16px   | 18px    | 400    | `text-base md:text-lg leading-relaxed`                            |
| Body text        | Inter            | 15px   | 16px    | 400    | `text-[15px] sm:text-base leading-relaxed`                        |
| Label / muted    | Inter            | 14px   | 14px    | 400    | `text-sm text-muted`                                              |

Line height rules:

- Headings: `leading-[1.1]` on desktop H1, natural on mobile. Section headings: `leading-[1.15]`.
- Body copy: `leading-relaxed` (~1.625). Close enough to spec's 1.6 — do not use `leading-[1.6]` (arbitrary values add noise).
- Labels: default (`leading-normal`).

Tracking rules:

- All headings: `tracking-tight`. Never `tracking-normal` or wider on headings.
- Body/UI: default tracking.

Color rules: all text uses `text-text` (`#1A1A1A`) for primary copy, `text-muted` (`#9A9590`) for labels and metadata. Never hardcode hex in className.

---

## Logomark

**Launch:** Wordmark only — "Lawn Agent" set in Playfair Display. No icon at launch. Leaf, grass, and house marks are fully commoditized in this category.

**Favicon:** "LA" monogram, `#4A7C59` on `#FAF8F4`. Transparent background on wordmark.

**Future logomark direction (post-launch):**

- Abstract or geometric — not illustrative
- Rendered in accent `#4A7C59`
- Transparent background, no container shape
- Must work when product expands beyond lawn to full property brain
- Avoid: leaf shapes, grass blades, house silhouettes, circle badges, sun/cloud marks

**Asset path:** `public/brand/logomark.png` — 1024×1024, transparent background. Run `/assets` after dropping file.

---

## Emotional Arc

- Land: Recognized. "This is the thing I've been looking for."
- Read: Relieved. "I don't have to figure this out myself."
- Scroll: Convinced. "This actually works the way I want it to."
- Convert: Ready. "Obvious decision."

Peak never reaches enthusiasm. The user wants clarity and confidence — not excitement. Never hype. Never celebrate. Just deliver.

---

## Copy Examples

- Hero H1: "Your yard. Figured out."
- Hero sub-copy: "Stop researching. Stop guessing. Stop starting over every spring."
- CTA: "I want a better yard"
- Onboarding screen 1: "We'll use this to tell you what your lawn needs."
- Onboarding screen 2: "Here's what your lawn needs today." / "Approve or pass. That's it."
- Onboarding screen 3: "Here's what we're starting with for your area." / "We'll get more accurate every season."
- Assumption label (medium confidence): "Clay-loam soil — likely for your area"
- Assumption label (confirmed): "Cool-season grass — does that sound right? [Yes / No, change it]"
- Locked attribute: "Soil pH not measured — get a soil test before we recommend amendments"
- Footer: TBD
- Error: "Something went wrong. Try again."
- Early access waitlist headline: TBD — write after first 10 users give signal on language
- Waitlist success: "You're on the list. We'll be in touch."

---

## Yard vs. Lawn — intentional distinction. Do not collapse it.

- "Yard" — the whole property. The Saturday feeling. The emotional object. The broader promise.
- "Lawn" — the grass specifically. The actionable, specific scope.
- "Lawn Agent knows your yard" — broad promise.
- "Here's what your lawn needs today" — specific action.
- Confirmed by Dieter Rams. Leave it.
