# Lawn Agent — Guide

_Updated April 17, 2026._

---

## What's live

Visit [lawnagent.app](https://lawnagent.app).

The page has three sections and a footer. No login. No dashboard. Just the landing page.

---

## Signing up for early access

1. Go to [lawnagent.app](https://lawnagent.app)
2. Type your email into the field
3. Click **I want a better yard**
4. You see: "You're on the list. We'll be in touch."

If it fails: "Something went wrong. Try again." appears. Try again.

---

## What's not built yet

Everything past the landing page — onboarding, dashboard, proposals, login. Not built.

---

## Status

| Feature         | Status              |
| --------------- | ------------------- |
| Landing page    | ✅ Live             |
| Email waitlist  | ✅ Live             |
| Feedback widget | ⏳ Built, not wired |
| Onboarding      | ❌ Not built        |
| Dashboard       | ❌ Not built        |
| Proposals       | ❌ Not built        |
| Profile         | ❌ Not built        |

| `/api/proposals` | ❌ Not built | Requires `@ai-sdk/anthropic` + `@neondatabase/serverless`. |
| `/api/yard` | ❌ Not built | Requires `@neondatabase/serverless`. |
| `/api/interactions` | ❌ Not built | Requires `@neondatabase/serverless`. |
| Neon DB | ❌ Not installed | Planned: `@neondatabase/serverless`. |
| Anthropic / AI | ❌ Not installed | Planned: `@ai-sdk/anthropic` + `ai`. |
