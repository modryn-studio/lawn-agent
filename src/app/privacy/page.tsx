import type { Metadata } from 'next';
import Link from 'next/link';
import { site } from '@/config/site';
import Footer from '@/components/footer';

export const metadata: Metadata = {
  title: `Privacy Policy — How ${site.name} Handles Your Data`,
  description:
    'Lawn Agent collects only what it needs to generate your lawn proposal. No data sold. No tracking cookies. US zip codes and inferred yard attributes only.',
  openGraph: {
    title: `Privacy Policy — How ${site.name} Handles Your Data`,
    description:
      'Lawn Agent collects only what it needs to generate your lawn proposal. No data sold. No tracking cookies.',
    url: `${site.url}/privacy`,
    siteName: site.name,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Privacy Policy — How ${site.name} Handles Your Data`,
    description:
      'Lawn Agent collects only what it needs to generate your lawn proposal. No data sold. No tracking cookies.',
  },
};

export default function PrivacyPage() {
  return (
    <main>
      <article className="bg-bg px-4 py-16 sm:px-6 md:py-24">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-heading text-text mb-10 text-3xl font-normal tracking-tight md:text-[40px] md:leading-[1.15]">
            Privacy Policy
          </h1>

          <p className="text-muted mb-10 text-sm">Effective April 20, 2026</p>

          <div className="space-y-10 text-[15px] leading-relaxed text-(--color-text)">
            <section>
              <h2 className="text-text mb-3 text-lg font-medium">What we collect</h2>
              <p>When you use Lawn Agent, we collect the following information:</p>
              <ul className="text-text mt-3 list-disc space-y-1 pl-5">
                <li>Your email address, when you create an account or join the waitlist</li>
                <li>Your US zip code, to look up your USDA hardiness zone</li>
                <li>
                  Inferred yard attributes derived from your zone: grass type, soil type estimate,
                  and geographic coordinates
                </li>
                <li>
                  Interactions you take on proposals: approve, pass, complete, or correct an
                  attribute
                </li>
              </ul>
              <p className="mt-3">
                We do not collect your name, address, phone number, or payment information. We do
                not collect anything about your device or browsing behavior beyond what Vercel
                Analytics records by default (aggregate pageviews — no fingerprinting, no cross-site
                tracking).
              </p>
            </section>

            <section>
              <h2 className="text-text mb-3 text-lg font-medium">How it&apos;s stored</h2>
              <p>
                Your data is stored in a Neon Postgres database hosted on AWS in the US East (N.
                Virginia) region. Proposal data and yard attributes are associated with your account
                and retained as long as your account is active.
              </p>
            </section>

            <section>
              <h2 className="text-text mb-3 text-lg font-medium">Third-party processors</h2>
              <p>We use the following services to operate Lawn Agent:</p>
              <ul className="text-text mt-3 list-disc space-y-2 pl-5">
                <li>
                  <strong>Vercel</strong> — hosting and deployment. Vercel Analytics collects
                  aggregate pageview data. No cookies set by Vercel Analytics. See{' '}
                  <a
                    href="https://vercel.com/legal/privacy-policy"
                    className="text-accent underline underline-offset-2"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Vercel Privacy Policy
                  </a>
                  .
                </li>
                <li>
                  <strong>Neon</strong> — serverless Postgres database. Data is stored in the US.
                  See{' '}
                  <a
                    href="https://neon.tech/privacy-policy"
                    className="text-accent underline underline-offset-2"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Neon Privacy Policy
                  </a>
                  .
                </li>
                <li>
                  <strong>Resend</strong> — transactional email delivery (account confirmation,
                  waitlist notifications). We send your email address to Resend solely to deliver
                  email. See{' '}
                  <a
                    href="https://resend.com/legal/privacy-policy"
                    className="text-accent underline underline-offset-2"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Resend Privacy Policy
                  </a>
                  .
                </li>
                <li>
                  <strong>Anthropic</strong> — AI proposal generation. When generating a lawn
                  proposal, we send your USDA zone and inferred yard attributes to Anthropic&apos;s
                  API. We do not send your email address or any personally identifiable information
                  to Anthropic. See{' '}
                  <a
                    href="https://www.anthropic.com/legal/privacy"
                    className="text-accent underline underline-offset-2"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Anthropic Privacy Policy
                  </a>
                  .
                </li>
                <li>
                  <strong>Neon Auth</strong> — authentication session management. A session cookie
                  is set when you sign in. It is used only to maintain your login state and expires
                  when you sign out or the session lapses.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-text mb-3 text-lg font-medium">Cookies</h2>
              <p>
                We set one cookie: an authentication session cookie used to keep you signed in. We
                do not use advertising cookies, tracking pixels, or third-party analytics cookies.
              </p>
            </section>

            <section>
              <h2 className="text-text mb-3 text-lg font-medium">Data sharing and sale</h2>
              <p>
                We do not sell your data. We do not share your data with advertisers. We do not use
                your data to train AI models. Data is shared with third-party processors listed
                above only to the extent necessary to operate the service.
              </p>
            </section>

            <section>
              <h2 className="text-text mb-3 text-lg font-medium">Your rights</h2>
              <p>
                You can request deletion of your account and all associated data at any time by
                emailing{' '}
                <a
                  href={`mailto:${site.email}`}
                  className="text-accent underline underline-offset-2"
                >
                  {site.email}
                </a>
                . We will process deletion requests within 30 days.
              </p>
            </section>

            <section>
              <h2 className="text-text mb-3 text-lg font-medium">Changes to this policy</h2>
              <p>
                If we make material changes to this policy, we will update the effective date at the
                top of this page. Continued use of Lawn Agent after changes are posted constitutes
                acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-text mb-3 text-lg font-medium">Contact</h2>
              <p>
                Questions about this policy:{' '}
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
