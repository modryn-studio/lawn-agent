'use client';

import { useState, type FormEvent } from 'react';
import { analytics } from '@/lib/analytics';
import { site } from '@/config/site';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function HeroSignup() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || submitting) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'newsletter', email }),
      });

      if (!res.ok) {
        setError('Something went wrong. Try again.');
        return;
      }

      setDone(true);
      analytics.newsletterSignup();
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="mt-8">
        <p className="text-accent text-sm">{site.waitlist.success}</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="hero-email" className="sr-only">
          Email address
        </label>
        <Input
          id="hero-email"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={submitting}
          className="h-12 flex-1 rounded-[6px]"
        />
        <Button
          type="submit"
          disabled={submitting}
          className="h-12 rounded-[6px] px-8 text-[15px] font-medium"
        >
          {submitting ? 'Sending...' : site.cta}
        </Button>
      </form>
      <p className="text-muted mt-3 text-sm">First 10 spots. No credit card.</p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
