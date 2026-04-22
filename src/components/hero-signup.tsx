import Link from 'next/link';
import { site } from '@/config/site';

export default function HeroSignup() {
  return (
    <div className="mt-6 md:mt-8">
      <Link
        href="/onboarding"
        className="bg-accent text-accent-foreground rounded-button inline-flex h-12 w-full items-center justify-center px-8 text-[15px] font-medium"
      >
        {site.cta}
      </Link>
      <p className="text-muted mt-3 text-sm">First 10 spots. No credit card.</p>
      <p className="text-muted mt-2 text-sm">
        Already have an account?{' '}
        <Link href="/signin" className="hover:text-text underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </div>
  );
}
