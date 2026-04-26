'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import { authClient } from '@/lib/auth/client';

interface SigninScreenProps {
  redirectAfterSignin?: string | null;
}

export default function SigninScreen({ redirectAfterSignin }: SigninScreenProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        const status = result.error.status;
        if (status === 429) {
          setError('Too many attempts. Try again in a few minutes.');
        } else if (status === 401 || status === 400) {
          setError('Check your email and password.');
        } else {
          setError('Something went wrong. Try again.');
        }
        return;
      }
      router.push(redirectAfterSignin ?? '/dashboard');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'Invalid email or password') {
        setError('Check your email and password.');
      } else if (
        msg.toLowerCase().includes('too many') ||
        msg.toLowerCase().includes('rate limit')
      ) {
        setError('Too many attempts. Try again in a few minutes.');
      } else {
        setError('Something went wrong. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 sm:px-6">
      <div className="w-full max-w-sm space-y-6">
        <p className="font-heading text-text text-center text-base font-bold md:text-lg">
          Lawn Agent
        </p>
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
              aria-invalid={error ? true : undefined}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              className={cn('rounded-button', error && 'border-error')}
            />
          </div>
          <div>
            <label htmlFor="signin-password" className="sr-only">
              Password
            </label>
            <div className="relative">
              <Input
                id="signin-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                autoComplete="current-password"
                required
                value={password}
                aria-invalid={error ? true : undefined}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                className={cn('rounded-button pr-11', error && 'border-error')}
              />
              {/* raw <button> per design system — non-standard shape exception */}
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="text-muted hover:text-text absolute top-1/2 right-3 -translate-y-1/2"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-error text-sm">
              {error}
            </p>
          )}

          <Button type="submit" disabled={submitting} className="rounded-button w-full">
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <div className="space-y-2 text-center">
          <Link href="/forgot-password" className="text-muted hover:text-foreground block text-sm">
            Forgot password?
          </Link>
          <Link href="/onboarding" className="text-muted hover:text-foreground block text-sm">
            Don&apos;t have an account? Start here.
          </Link>
        </div>
      </div>
    </div>
  );
}
