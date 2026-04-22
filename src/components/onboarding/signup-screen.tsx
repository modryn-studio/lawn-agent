'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SignupScreenProps {
  onSignUp: (data: { name: string; email: string; password: string }) => Promise<void>;
  onBack: () => void;
  error?: string | null;
}

export default function SignupScreen({ onSignUp, onBack, error }: SignupScreenProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSignUp({ name, email, password });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 sm:px-6">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="font-heading text-text text-3xl font-normal tracking-tight md:text-[40px]">
          Next: what to buy and where to get it.
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="signup-name" className="sr-only">
              Name
            </label>
            <Input
              id="signup-name"
              type="text"
              placeholder="Name"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-button"
            />
          </div>
          <div>
            <label htmlFor="signup-email" className="sr-only">
              Email
            </label>
            <Input
              id="signup-email"
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
            <label htmlFor="signup-password" className="sr-only">
              Password
            </label>
            <Input
              id="signup-password"
              type="password"
              placeholder="Password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-button"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={submitting} className="rounded-button w-full">
            {submitting ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className="rounded-button text-muted mt-4 w-full text-sm"
        >
          Back to proposal
        </Button>

        <p className="text-muted text-center text-sm">
          Already have an account?{' '}
          <Link href="/signin" className="underline underline-offset-2 hover:text-text">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
