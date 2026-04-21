'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authClient } from '@/lib/auth/client';
import { Button } from '@/components/ui/button';

export function DashboardHeader() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await authClient.signOut();
      router.push('/');
    } catch {
      setIsSigningOut(false);
    }
  }

  return (
    <header className="border-border border-b px-4 py-4 sm:px-6">
      <div className="mx-auto flex w-full max-w-md items-center justify-between">
        <Link href="/dashboard" className="font-heading text-text text-base font-bold md:text-lg">
          Lawn Agent
        </Link>
        <Button
          variant="ghost"
          size="sm"
          disabled={isSigningOut}
          onClick={handleSignOut}
          className="rounded-button"
        >
          {isSigningOut ? 'Signing out…' : 'Sign out'}
        </Button>
      </div>
    </header>
  );
}
