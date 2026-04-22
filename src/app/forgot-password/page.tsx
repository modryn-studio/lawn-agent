import type { Metadata } from 'next';
import Link from 'next/link';
import { site } from '@/config/site';

export const metadata: Metadata = {
  title: `Forgot Password | ${site.name}`,
  description: 'Reset your Lawn Agent password.',
};

export default function ForgotPasswordPage() {
  return (
    <main className="bg-bg flex min-h-dvh flex-col items-center justify-center px-4 sm:px-6">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="font-heading text-text text-3xl font-normal tracking-tight md:text-[40px]">
          Forgot your password?
        </h1>
        <p className="text-muted text-sm leading-relaxed">
          Password reset isn&apos;t automated yet. Email us and we&apos;ll sort it out.
        </p>
        <a
          href={`mailto:${site.email}?subject=Password reset`}
          className="text-accent text-sm hover:underline"
        >
          {site.email}
        </a>
        <div className="pt-2">
          <Link href="/signin" className="text-muted text-sm hover:text-foreground">
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
