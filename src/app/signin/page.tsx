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
  // Wrapped in try/catch: Neon Auth may try to clear a stale cookie here, which Next.js forbids
  // in Server Components. On error treat as unauthenticated and render the sign-in form.
  // redirect() must be called outside the try/catch — it throws NEXT_REDIRECT internally and a
  // plain catch {} would swallow it, silently killing the redirect.
  let shouldRedirect = false;
  try {
    const { data: session } = await auth.getSession();
    if (session?.user) {
      const [property] = await sql`
        SELECT id FROM properties WHERE user_id = ${session.user.id} LIMIT 1
      `;
      if (property) shouldRedirect = true;
    }
  } catch {
    // Cookie write attempted in Server Component — safe to ignore, render sign-in form
  }
  if (shouldRedirect) redirect('/dashboard');

  return (
    <main className="bg-bg min-h-dvh">
      <SigninScreen />
    </main>
  );
}
