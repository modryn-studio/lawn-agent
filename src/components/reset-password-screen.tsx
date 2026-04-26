'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import { Eye, EyeOff } from 'lucide-react';
import { authClient } from '@/lib/auth/client';

export default function ResetPasswordScreen() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting || !token) return;
    setSubmitting(true);
    setError(null);

    try {
      const result = await authClient.resetPassword({ newPassword: password, token });

      if (result.error) {
        const status = result.error.status;
        if (status === 400 || status === 401) {
          setError('This link is expired or invalid. Request a new one.');
        } else if (status === 422) {
          setError('Password must be at least 8 characters.');
        } else {
          setError('Something went wrong. Try again.');
        }
        return;
      }

      setDone(true);
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4 sm:px-6">
        <div className="w-full max-w-sm space-y-4">
          <h1 className="font-heading text-text text-3xl font-normal tracking-tight md:text-[40px]">
            Invalid link.
          </h1>
          <p className="text-muted text-sm leading-relaxed">
            This reset link isn&apos;t valid or has expired.
          </p>
          <Link href="/forgot-password" className="text-muted hover:text-foreground block text-sm">
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4 sm:px-6">
        <div className="w-full max-w-sm space-y-4">
          <h1 className="font-heading text-text text-3xl font-normal tracking-tight md:text-[40px]">
            Password updated.
          </h1>
          <Link href="/signin" className="text-muted hover:text-foreground block text-sm">
            Sign in
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
          Set a new password.
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="new-password" className="sr-only">
              New password
            </label>
            <Input
              id="new-password"
              type="password"
              placeholder="New password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              aria-invalid={error ? true : undefined}
              onChange={(e) => {
                setPassword(e.target.value);
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
            {submitting ? 'Saving…' : 'Set password'}
          </Button>
        </form>

        <Link href="/signin" className="text-muted hover:text-foreground block text-center text-sm">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
