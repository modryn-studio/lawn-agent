# Lawn Agent — User Guide

_Last updated: April 15, 2026. Reflects actual codebase state, not roadmap._

---

## What the app does right now

One page. An email signup form. That's the entire product surface available to users today.

The rest — onboarding, dashboard, proposals, yard profile — is planned but not built yet.

---

## The home page (`/`)

When you visit [lawnagent.app](https://lawnagent.app), you see an email signup section. The full landing page copy exists in `docs/lawn-agent-landing-page-v1.md` but has not been built into the page yet. The page is a stub pending that build.

### Email signup

1. You see a heading ("Early access") and a subheadline ("Sign up to be first in line.")
2. Type your email address into the input field labeled `your@email.com`
3. Click **Notify me**
4. The button changes to "Sending..." while the request is in flight
5. On success: the form disappears and you see "You're on the list. We'll be in touch."
6. On error: "Something went wrong. Try again." appears below the form

The form posts to `/api/feedback` with `{ type: 'newsletter', email }`.

---

## API routes

### `POST /api/feedback`

Handles three submission types: `newsletter`, `feedback`, `bug`.

**Newsletter signup** (`type: 'newsletter'`):

- Requires a valid email address
- Sends a notification email to the configured inbox via Gmail (nodemailer)
- Optionally adds the email to a Resend contacts audience (best-effort, non-blocking)

**Feedback / bug report** (`type: 'feedback'` or `type: 'bug'`):

- Email is optional
- Accepts `message` (text) and `page` (URL string) fields
- Sends a notification email with the message contents

**Required environment variables:**

- `GMAIL_USER` — the Gmail address used to send notifications
- `GMAIL_APP_PASSWORD` — Gmail app password (not your account password — generate one at myaccount.google.com → Security → App passwords)
- `FEEDBACK_TO` — (optional) destination inbox; defaults to `GMAIL_USER`

**Optional environment variables:**

- `RESEND_API_KEY` — enables adding signups to Resend contacts
- `RESEND_SEGMENT_ID` — Resend segment/audience to tag signups under

If `GMAIL_USER` or `GMAIL_APP_PASSWORD` are missing, the route returns `503 Email service unavailable`.

---

## Components

### `EmailSignup`

The waitlist capture form. Reads copy from `src/config/site.ts` (`waitlist.headline`, `waitlist.subheadline`, `waitlist.success`). Posts to `/api/feedback`. Used on the home page.

### `FeedbackWidget`

A slide-out feedback panel. Desktop: side tab at the right edge of the screen. Mobile: bottom sheet. Accepts a text message and optional email.

**Not wired yet.** The component exists at `src/components/feedback-widget.tsx` but is not imported into `layout.tsx`. To activate: add `<FeedbackWidget />` as the last child inside `<body>` in `src/app/layout.tsx`.

### `FeedbackTrigger`

A "Feedback" button for mobile — hidden on desktop (md+). Dispatches the `open-feedback` custom event that `FeedbackWidget` listens for. Intended to live in the footer.

**Not wired yet.** Depends on `FeedbackWidget` being wired first.

### `SiteSchema`

Renders site-wide JSON-LD structured data (WebSite + Organization schema) for Google rich results. Reads from `src/config/site.ts`.

**Not wired yet.** Add `<SiteSchema />` inside `<head>` in `src/app/layout.tsx` to activate.

---

## Status

| Feature               | Status                   | Notes                                                      |
| --------------------- | ------------------------ | ---------------------------------------------------------- |
| Email signup form     | ✅ Works                 | Posts to `/api/feedback`, sends notification email         |
| `/api/feedback` route | ✅ Works                 | Newsletter + feedback + bug. Requires Gmail env vars.      |
| Resend contacts sync  | ✅ Works (if configured) | Best-effort. Requires `RESEND_API_KEY`.                    |
| Vercel Analytics      | ✅ Works                 | Zero-config pageview tracking in `layout.tsx`.             |
| Full landing page     | ⏳ Not built             | Copy ready in `docs/lawn-agent-landing-page-v1.md`.        |
| FeedbackWidget        | ⏳ Not wired             | Component exists, not in layout.                           |
| SiteSchema            | ⏳ Not wired             | Component exists, not in layout.                           |
| `/onboarding`         | ❌ Not built             |                                                            |
| `/dashboard`          | ❌ Not built             |                                                            |
| `/profile`            | ❌ Not built             |                                                            |
| `/proposal/[id]`      | ❌ Not built             |                                                            |
| `/api/proposals`      | ❌ Not built             | Requires `@ai-sdk/anthropic` + `@neondatabase/serverless`. |
| `/api/yard`           | ❌ Not built             | Requires `@neondatabase/serverless`.                       |
| `/api/interactions`   | ❌ Not built             | Requires `@neondatabase/serverless`.                       |
| Neon DB               | ❌ Not installed         | Planned: `@neondatabase/serverless`.                       |
| Anthropic / AI        | ❌ Not installed         | Planned: `@ai-sdk/anthropic` + `ai`.                       |
