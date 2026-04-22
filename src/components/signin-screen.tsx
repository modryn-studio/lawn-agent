'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/auth/client';

export default function SigninScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const result = await authClient.signIn.email({ email, password });
    if (result.error) {
      setError(result.error.message || 'Sign in failed. Check your email and password.');
      setSubmitting(false);
      return;
    }
    router.push('/dashboard');
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 sm:px-6">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="font-heading text-text text-3xl font-normal tracking-tight md:text-[40px]">
          Welcome back.
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="signin-email" className="sr-only">
              Email
            </label>
            <Input
              id="signin-email"
              type="email"
              placeholder="Email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-button"
            />
          </div>
          <div>
            <label htmlFor="signin-password" className="sr-only">
              Password
            </label>
            <Input
              id="signin-password"
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-button"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={submitting} className="rounded-button w-full">
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <div className="space-y-2 text-center">
          <Link href="/forgot-password" className="text-muted block text-sm hover:text-foreground">
            Forgot password?
          </Link>
          <Link href="/onboarding" className="text-muted block text-sm hover:text-foreground">
            Don&apos;t have an account? Start here.
          </Link>
        </div>
      </div>
    </div>
  );
}
