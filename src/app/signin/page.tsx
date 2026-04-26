import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { site } from '@/config/site';
import { auth } from '@/lib/auth/server';
import { sql } from '@/lib/db';
import SigninScreen from '@/components/signin-screen';

export const metadata: Metadata = {
  title: `Sign In | ${site.name}`,
  description:
    'Sign in to your Lawn Agent account. View your active lawn proposal, yard profile, and treatment history. Your agent picks up exactly where you left off.',
  openGraph: {
    title: `Sign In | ${site.name}`,
    description:
      'Sign in to your Lawn Agent account. View your active lawn proposal, yard profile, and treatment history. Your agent picks up exactly where you left off.',
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

export default async function SigninPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  // Already onboarded users go straight to the dashboard.
  // Wrapped in try/catch: Neon Auth may try to clear a stale cookie here, which Next.js forbids
  // in Server Components. On error treat as unauthenticated and render the sign-in form.
  // redirect() must be called outside the try/catch — it throws NEXT_REDIRECT internally and a
  // plain catch {} would swallow it, silently killing the redirect.
  let redirectTo: string | null = null;
  try {
    const { data: session } = await auth.getSession();
    if (session?.user) {
      const [property] = await sql`
        SELECT id FROM properties WHERE user_id = ${session.user.id} LIMIT 1
      `;
      // Authenticated + property → dashboard. Authenticated but no property → resume onboarding.
      redirectTo = property ? '/dashboard' : '/onboarding';
    }
  } catch {
    // Cookie write attempted in Server Component — safe to ignore, render sign-in form
  }
  if (redirectTo) redirect(redirectTo);

  // Validate the redirect param: must be a relative path, not an open redirect vector.
  const params = await searchParams;
  const raw = params.redirect;
  const redirectAfterSignin =
    typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//') ? raw : null;

  return (
    <main className="bg-bg min-h-dvh">
      <SigninScreen redirectAfterSignin={redirectAfterSignin} />
    </main>
  );
}
