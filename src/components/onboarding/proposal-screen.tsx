'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ProposalContent } from '@/lib/proposals';

interface ProposalScreenProps {
  proposal: ProposalContent;
  zone: string;
  error?: string | null;
  onApprove: () => void;
  onPass: (email?: string) => void;
}

export default function ProposalScreen({
  proposal,
  zone,
  error,
  onApprove,
  onPass,
}: ProposalScreenProps) {
  const [passed, setPassed] = useState(false);
  const [email, setEmail] = useState('');

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 sm:px-6">
      <div className="w-full max-w-120">
        <h1 className="font-heading text-text mb-8 text-3xl font-normal tracking-tight md:text-[40px]">
          Here&apos;s what your lawn needs today.
        </h1>

        <div className="border-border rounded-lg border bg-white p-5 sm:p-8">
          <p className="text-muted mb-4 text-xs tracking-widest uppercase">Zone {zone}</p>
          <p className="text-text text-base leading-snug font-medium">{proposal.title}</p>
          <p className="text-text mt-3 text-[15px] leading-relaxed">{proposal.summary}</p>
          <p className="text-muted mt-2 text-sm">{proposal.timing}</p>
          {proposal.product_suggestion && (
            <p className="text-accent mt-6 text-sm">{proposal.product_suggestion}</p>
          )}
        </div>

        {!passed ? (
          <>
            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
            <p className="text-muted mt-8 text-sm">Approve or pass. That&apos;s it.</p>
            <div className="mt-6 flex gap-3">
              <Button onClick={onApprove} className="rounded-button flex-1">
                Approve
              </Button>
              <Button
                variant="ghost"
                onClick={() => setPassed(true)}
                className="rounded-button flex-1"
              >
                Pass
              </Button>
            </div>
          </>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="text-text text-sm">Not the right time. We&apos;ll be here when it is.</p>
            <div className="flex gap-2">
              <label htmlFor="pass-email" className="sr-only">
                Email
              </label>
              <Input
                id="pass-email"
                type="email"
                placeholder="Email (optional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-button"
              />
              <Button
                variant="secondary"
                onClick={() => onPass(email || undefined)}
                className="rounded-button shrink-0"
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
