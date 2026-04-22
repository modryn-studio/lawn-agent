import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { site } from '@/config/site';
import { auth } from '@/lib/auth/server';
import { sql } from '@/lib/db';
import SigninScreen from '@/components/signin-screen';

export const metadata: Metadata = {
  title: `Sign In | ${site.name}`,
  description: 'Sign in to your Lawn Agent account to see your active proposals and yard profile.',
  openGraph: {
    title: `Sign In | ${site.name}`,
    description:
      'Sign in to your Lawn Agent account to see your active proposals and yard profile.',
    url: `${site.url}/signin`,
    siteName: site.name,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Sign In | ${site.name}`,
    description: 'Sign in to your Lawn Agent account.',
  },
};

export default async function SigninPage() {
  // Already onboarded users go straight to the dashboard.
  const { data: session } = await auth.getSession();
  if (session?.user) {
    const [property] = await sql`
      SELECT id FROM properties WHERE user_id = ${session.user.id} LIMIT 1
    `;
    if (property) redirect('/dashboard');
  }

  return (
    <main className="bg-bg min-h-dvh">
      <SigninScreen />
    </main>
  );
}
