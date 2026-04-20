import type { Metadata } from 'next';
import Link from 'next/link';
import { site } from '@/config/site';
import Footer from '@/components/footer';

export const metadata: Metadata = {
  title: `Terms of Service | ${site.name}`,
  description:
    'Lawn Agent terms of service. US zip codes only. Proposals are informational, not professional agronomist advice.',
  openGraph: {
    title: `Terms of Service | ${site.name}`,
    description:
      'Lawn Agent terms of service. US zip codes only. Proposals are informational, not professional agronomist advice.',
    url: `${site.url}/terms`,
    siteName: site.name,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Terms of Service | ${site.name}`,
    description:
      'Lawn Agent terms of service. US zip codes only. Proposals are informational, not professional agronomist advice.',
  },
};

export default function TermsPage() {
  return (
    <main>
      <article className="bg-bg px-4 py-16 sm:px-6 md:py-24">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-heading text-text mb-10 text-3xl font-normal tracking-tight md:text-[40px] md:leading-[1.15]">
            Terms of Service
          </h1>

          <p className="text-muted mb-10 text-sm">Effective April 20, 2026</p>

          <div className="space-y-10 text-[15px] leading-relaxed text-(--color-text)">
            <section>
              <h2 className="text-text mb-3 text-lg font-medium">What Lawn Agent is</h2>
              <p>
                Lawn Agent is a tool that generates lawn treatment proposals based on your US zip
                code and inferred yard attributes. It is currently available for US addresses only.
                Proposals are generated using publicly available USDA hardiness zone data and
                AI-assisted inference.
              </p>
            </section>

            <section>
              <h2 className="text-text mb-3 text-lg font-medium">Not professional advice</h2>
              <p>
                Lawn Agent does not provide professional agronomic, horticultural, or landscaping
                advice. Proposals are informational starting points based on zone-level inference —
                not assessments of your specific lawn. Results will vary. We make no guarantees
                about proposal accuracy, product performance, or outcomes. Apply any product
                according to the manufacturer&apos;s label instructions.
              </p>
            </section>

            <section>
              <h2 className="text-text mb-3 text-lg font-medium">Your account</h2>
              <p>
                You must provide accurate information when creating an account. You are responsible
                for all activity under your account. Do not share your login credentials. One
                account per person.
              </p>
            </section>

            <section>
              <h2 className="text-text mb-3 text-lg font-medium">Acceptable use</h2>
              <p>You agree not to:</p>
              <ul className="text-text mt-3 list-disc space-y-1 pl-5">
                <li>Use automated tools to access or scrape Lawn Agent</li>
                <li>Resell, sublicense, or redistribute Lawn Agent output</li>
                <li>Attempt to reverse-engineer or extract proprietary data or prompts</li>
                <li>Use Lawn Agent in any way that violates applicable law</li>
              </ul>
            </section>

            <section>
              <h2 className="text-text mb-3 text-lg font-medium">Geographic limitation</h2>
              <p>
                Lawn Agent currently supports US zip codes only. Zone data is sourced from the USDA
                Plant Hardiness Zone Map. We do not support international addresses at this time.
              </p>
            </section>

            <section>
              <h2 className="text-text mb-3 text-lg font-medium">Termination</h2>
              <p>
                We may suspend or terminate accounts that violate these terms, at our discretion,
                with or without notice. You may delete your account at any time by emailing{' '}
                <a
                  href={`mailto:${site.email}`}
                  className="text-accent underline underline-offset-2"
                >
                  {site.email}
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-text mb-3 text-lg font-medium">Limitation of liability</h2>
              <p>
                Lawn Agent is provided &quot;as is&quot; without warranty of any kind. To the
                maximum extent permitted by law, {site.name} and its operators are not liable for
                any indirect, incidental, or consequential damages arising from your use of the
                service.
              </p>
            </section>

            <section>
              <h2 className="text-text mb-3 text-lg font-medium">Changes to these terms</h2>
              <p>
                We may update these terms from time to time. Material changes will be reflected in
                the effective date at the top of this page. Continued use after changes are posted
                constitutes acceptance.
              </p>
            </section>

            <section>
              <h2 className="text-text mb-3 text-lg font-medium">Contact</h2>
              <p>
                Questions about these terms:{' '}
                <a
                  href={`mailto:${site.email}`}
                  className="text-accent underline underline-offset-2"
                >
                  {site.email}
                </a>
              </p>
            </section>

            <p className="text-muted pt-4 text-sm">
              <Link href="/" className="underline underline-offset-2 hover:text-(--color-text)">
                Back to Lawn Agent
              </Link>
            </p>
          </div>
        </div>
      </article>
      <Footer />
    </main>
  );
}
