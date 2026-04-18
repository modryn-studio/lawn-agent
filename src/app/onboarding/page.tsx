import type { Metadata } from 'next';
import { Suspense } from 'react';
import { site } from '@/config/site';
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

export default function OnboardingPage() {
  return (
    <main className="bg-bg min-h-dvh">
      <Suspense>
        <OnboardingContent />
      </Suspense>
    </main>
  );
}
