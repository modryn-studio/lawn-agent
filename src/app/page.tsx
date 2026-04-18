import type { Metadata } from 'next';
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

export default function Home() {
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
