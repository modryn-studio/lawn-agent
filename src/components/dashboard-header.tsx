'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/client';

export function DashboardHeader() {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push('/');
  }

  return (
    <header className="border-border border-b px-4 py-4 sm:px-6">
      <div className="mx-auto flex w-full max-w-md items-center justify-between">
        <Link
          href="/dashboard"
          className="font-heading text-text text-base font-bold md:text-lg"
        >
          Lawn Agent
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="text-muted text-sm hover:text-text transition-colors"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
