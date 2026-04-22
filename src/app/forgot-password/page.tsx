import type { Metadata } from 'next';
import { site } from '@/config/site';
import ForgotPasswordScreen from '@/components/forgot-password-screen';

export const metadata: Metadata = {
  title: `Forgot Password | ${site.name}`,
  description: "Enter your email address and we'll send you a link to reset your Lawn Agent password. The link expires after 1 hour.",
  openGraph: {
    title: `Forgot Password | ${site.name}`,
    description: "Enter your email address and we'll send you a link to reset your Lawn Agent password. The link expires after 1 hour.",
    url: `${site.url}/forgot-password`,
    siteName: site.name,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Forgot Password | ${site.name}`,
    description: 'Reset your Lawn Agent password.',
  },
};

export default function ForgotPasswordPage() {
  return (
    <main className="bg-bg min-h-dvh">
      <ForgotPasswordScreen />
    </main>
  );
}
