import type { Metadata } from 'next';
import { Suspense } from 'react';
import { site } from '@/config/site';
import ResetPasswordScreen from '@/components/reset-password-screen';

export const metadata: Metadata = {
  title: `Reset Password | ${site.name}`,
  description: 'Set a new password for your Lawn Agent account.',
  openGraph: {
    title: `Reset Password | ${site.name}`,
    description: 'Set a new password for your Lawn Agent account.',
    url: `${site.url}/reset-password`,
    siteName: site.name,
    type: 'website',
  },
};

export default function ResetPasswordPage() {
  return (
    <main className="bg-bg min-h-dvh">
      {/* Suspense required: ResetPasswordScreen uses useSearchParams() */}
      <Suspense>
        <ResetPasswordScreen />
      </Suspense>
    </main>
  );
}
