'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import { authClient } from '@/lib/auth/client';
import { site } from '@/config/site';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: `${site.url}/reset-password`,
      });

      if (result.error) {
        setError('Something went wrong. Try again.');
        return;
      }

      setSent(true);
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4 sm:px-6">
        <div className="w-full max-w-sm space-y-4">
          <h1 className="font-heading text-text text-3xl font-normal tracking-tight md:text-[40px]">
            Check your inbox.
          </h1>
          <p className="text-muted text-sm leading-relaxed">
            We sent a reset link to {email}. It may take a minute.
          </p>
          <Link
            href="/signin"
            className="text-muted hover:text-foreground block text-center text-sm"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 sm:px-6">
      <div className="w-full max-w-sm space-y-6">
        <p className="font-heading text-text text-center text-base font-bold md:text-lg">
          Lawn Agent
        </p>
        <h1 className="font-heading text-text text-3xl font-normal tracking-tight md:text-[40px]">
          Forgot your password?
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reset-email" className="sr-only">
              Email
            </label>
            <Input
              id="reset-email"
              type="email"
              placeholder="Email"
              autoComplete="email"
              required
              value={email}
              aria-invalid={error ? true : undefined}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              className={cn('rounded-button', error && 'border-error')}
            />
          </div>

          {error && (
            <p role="alert" className="text-error text-sm">
              {error}
            </p>
          )}

          <Button type="submit" disabled={submitting} className="rounded-button w-full">
            {submitting ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>

        <Link href="/signin" className="text-muted hover:text-foreground block text-center text-sm">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
