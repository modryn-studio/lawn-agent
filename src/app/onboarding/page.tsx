import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { site } from '@/config/site';
import { auth } from '@/lib/auth/server';
import { sql } from '@/lib/db';
import OnboardingContent from './page-content';

export const metadata: Metadata = {
  title: `Get Your First Lawn Proposal | ${site.name}`,
  description:
    'Enter your zip code and get a real lawn treatment proposal in under a minute. No account required. Lawn Agent tells you what to buy and when.',
  openGraph: {
    title: `Get Your First Lawn Proposal | ${site.name}`,
    description:
      'Enter your zip code and get a real lawn treatment proposal in under a minute. No account required. Lawn Agent tells you what to buy and when.',
    url: `${site.url}/onboarding`,
    siteName: site.name,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Get Your First Lawn Proposal | ${site.name}`,
    description:
      'Enter your zip code and get a real lawn treatment proposal in under a minute. No account required.',
  },
};

export default async function OnboardingPage() {
  // Onboarding is a one-way door. Auth'd users with an existing property go straight to dashboard.
  // Wrapped in try/catch: Neon Auth may try to clear a stale cookie here, which Next.js forbids
  // in Server Components. On error treat as unauthenticated — OnboardingContent handles it client-side.
  try {
    const { data: session } = await auth.getSession();
    if (session?.user) {
      const [property] = await sql`
        SELECT id FROM properties WHERE user_id = ${session.user.id} LIMIT 1
      `;
      if (property) redirect('/dashboard');
    }
  } catch {
    // Cookie write attempted in Server Component — safe to ignore, client guard handles redirect
  }

  return (
    <main className="bg-bg min-h-dvh">
      <Suspense>
        <OnboardingContent />
      </Suspense>
    </main>
  );
}
