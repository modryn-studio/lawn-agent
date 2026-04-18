import Hero from '@/components/hero';
import ProposalCard from '@/components/proposal-card';
import HowItWorks from '@/components/how-it-works';
import HumanSection from '@/components/human-section';
import EarlyAccess from '@/components/early-access';

export default function Home() {
  return (
    <main>
      <Hero />
      <ProposalCard />
      <HowItWorks />
      <HumanSection />
      <EarlyAccess />
    </main>
  );
}
