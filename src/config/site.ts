// Single source of truth for all site-wide metadata.
// /init fills this in from context.md + brand.md.
// Every other file imports from here — never hardcode site metadata elsewhere.
export const site = {
  name: 'Lawn Agent',
  shortName: 'Lawn Agent',
  url: 'https://lawnagent.app',
  description:
    'Lawn Agent monitors your yard, generates treatment proposals, and gets the right product in your cart. You approve or pass. It gets smarter every season.',
  ogTitle: 'Lawn Agent — Your Yard, Figured Out',
  ogDescription:
    'Stop researching. Stop guessing. Lawn Agent tells you what your lawn needs, when it needs it, and gets the right product in your cart with one tap.',
  cta: 'I want a better yard',
  founder: 'Luke Hanner',
  email: 'hello@lawnagent.app',
  waitlist: {
    headline: 'Early access',
    subheadline: 'Sign up to be first in line.',
    success: 'You\u2019re on the list.',
  },
  accent: '#4A7C59',
  bg: '#FAF8F4',
  social: {
    twitter: 'https://x.com/lukehanner',
    twitterHandle: '@lukehanner',
    github: 'https://github.com/modryn-studio/lawn-agent',
    devto: 'https://dev.to/lukehanner',
    shipordie: 'https://shipordie.club/lukehanner',
  },
} as const;
