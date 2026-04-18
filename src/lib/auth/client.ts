'use client';

import { createAuthClient } from '@neondatabase/auth';
import { BetterAuthReactAdapter } from '@neondatabase/auth/react';

// Client-side auth instance. Uses BetterAuthReactAdapter for React hooks (useSession).
// Requests go to /api/auth/[...path] which proxies to the Neon Auth server.
export const authClient = createAuthClient(
  typeof window !== 'undefined' ? window.location.origin : '',
  { adapter: BetterAuthReactAdapter() }
);
