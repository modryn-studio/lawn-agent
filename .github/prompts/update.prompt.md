---
name: update
description: Re-reads context.md and brand.md and cascades any changes into copilot-instructions.md, site.ts, next.config.ts, and docs/guide.md
agent: agent
---

`context.md` and `brand.md` are the source of truth for this project. This command cascades any edits from those files into the derived files that `/setup` originally populated.

Run this any time you edit `context.md` or `brand.md`. Do not run `/setup` again — that re-runs setup steps (wiring components, installing packages) that should only happen once.

---

## Step 1: Read the source files

Read both source files:

1. `context.md` — product name, URL, target user, stack, routes, monetization, analytics events
2. `brand.md` — voice rules, visual rules, user types, emotional arc, copy examples

---

## Step 2: Cascade into `copilot-instructions.md`

Update the following sections based on what changed. Do not touch sections that haven't changed. Do not touch `## README Standard`, `## API Route Logging`, `## Analytics`, `## Dev Server`, `## Code Style`, or `## Core Rules` — those are permanent.

- **`## Who I Am`** — product description, user types from `brand.md` and `context.md`
- **`## Stack`** — derive from `package.json` (installed) + `context.md` Stack Additions (not yet installed). Never list a package as installed if it's not in `package.json`.
- **`## Project Structure`** — any new dirs added to `context.md` Project Structure Additions
- **`## Route Map`** — every route listed in `context.md` Route Map, one-line description each. Always include `/privacy` and `/terms`.
- **`## Brand & Voice`** — voice rules, visual rules, emotional arc, copy rules, user-type-specific rules from `brand.md`

---

## Step 3: Cascade into `src/config/site.ts`

Only update fields that differ from the current source. Check each:

- `name` / `shortName` — from `context.md` product name
- `url` — from `context.md` URL section
- `description` — 110–160 char meta description
- `ogTitle` — 50–60 char, format: "Product Name | Short Value Prop"
- `ogDescription` — 110–160 char, slightly more marketing-forward
- `founder` — from `context.md` or default "Luke Hanner"
- `accent` / `bg` — hex values from `brand.md` Visual Rules
- `social.*` — from `context.md` Social Profiles section

If a field is already accurate, leave it alone.

---

## Step 4: Cascade into `next.config.ts`

Check the deployment mode in `context.md` Deployment section.

- If `mode: standalone-domain` — `basePath` must be absent or empty in `next.config.ts`. Remove it if present.
- If `mode: modryn-app` — extract the slug (last path segment after `/tools/` in the URL field) and set `basePath: '/tools/[slug]'`.

If the URL field or mode is blank, leave `next.config.ts` as-is and warn Luke.

---

## Step 5: Cascade into `README.md`

Update only if the values differ. Do not reformat the file — preserve the `<picture>` block (if present), H1, live link, and divider exactly.

- **Tagline** (line after the `# Product Name` heading): pull from `brand.md` Copy Examples — use the hero H1 value, optionally appended with a short phrase that matches the brand voice.
- **Stack line** (after `---`): derive from `package.json`. Format: `Name · Name · Name`. Major packages only. Never list a package not in `package.json`. Never include tools or services not actively used (e.g. GA4, Mixpanel) unless they appear in `package.json`.

If both are already accurate, leave the file alone.

---

## Step 6: Update `docs/guide.md`

Create the `docs/` directory if it doesn't exist. Generate or update `docs/guide.md` based on the **actual current state of the codebase** — not the source docs.

**Read these files:**

- `src/app/page.tsx` — what sections are on the page
- `src/components/` — any interactive components (forms, widgets)

**Write the guide with these rules:**

- Extremely short. Plain language. No jargon. No component names. No API details.
- One sentence of context, then numbered steps for any user action that exists.
- If a feature isn't live yet, say so in one line. Don't explain why.
- End with a status table: what works ✅, what's built but not wired ⏳, what's missing ❌.
- The entire guide should fit on one screen. If it's longer than ~40 lines, it's too long.

If `docs/guide.md` already exists, update it to reflect current state. Remove anything that's no longer true.

---

## Step 7: Report

After cascading, report:

- Which files were changed and which sections were updated
- Which files were already in sync (no changes needed)
- Anything in `context.md` or `brand.md` that is incomplete, contradictory, or missing that could cause issues later (flag but do not invent)

Do not commit. Luke reviews the diff and commits manually.
