import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/server';
import { site } from '@/config/site';
import Hero from '@/components/hero';
import ProposalCard from '@/components/proposal-card';
import HowItWorks from '@/components/how-it-works';
import HumanSection from '@/components/human-section';
import EarlyAccess from '@/components/early-access';
import Footer from '@/components/footer';

// TODO: title is 35 chars — below the 50-char SEO target. Brand tagline
// is short by design; expand when the product has more to say (e.g. add
// a category descriptor like "| Lawn Care App").
export const metadata: Metadata = {
  title: site.ogTitle,
  description: site.description,
  openGraph: {
    title: site.ogTitle,
    description: site.ogDescription ?? site.description,
    url: site.url,
    siteName: site.name,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: site.social?.twitterHandle,
    title: site.ogTitle,
    description: site.ogDescription ?? site.description,
  },
};

export const dynamic = 'force-dynamic';

export default async function Home() {
  try {
    const { data: session } = await auth.getSession();
    if (session?.user) redirect('/dashboard');
  } catch {
    // Stale cookie — treat as unauthenticated
  }

  return (
    <main>
      <Hero />
      <ProposalCard />
      <HowItWorks />
      <HumanSection />
      <EarlyAccess />
      <Footer />
    </main>
  );
}
