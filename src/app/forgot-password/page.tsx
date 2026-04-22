import type { Metadata } from 'next';
import { site } from '@/config/site';
import ForgotPasswordScreen from '@/components/forgot-password-screen';

export const metadata: Metadata = {
  title: `Forgot Password | ${site.name}`,
  description: 'Reset your Lawn Agent password.',
};

export default function ForgotPasswordPage() {
  return (
    <main className="bg-bg min-h-dvh">
      <ForgotPasswordScreen />
    </main>
  );
}
