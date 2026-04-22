'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { ProposalContent } from '@/lib/proposals';

const CATEGORY_LABELS: Record<ProposalContent['category'], string> = {
  fertilization: 'Fertilizer applied.',
  weed_control: 'Weed treatment applied.',
  overseeding: 'Overseeding done.',
  aeration: 'Aeration done.',
  watering: 'Watering scheduled.',
  pest_control: 'Pest treatment applied.',
  soil_amendment: 'Soil amendment applied.',
  mowing: 'Mowing done.',
  other: 'Done.',
};

interface Props {
  proposal: ProposalContent;
  proposalId: string;
  propertyId: string;
  zone: string | null;
}

type CardStatus = 'active' | 'confirming' | 'loading' | 'confirmed';

export function DashboardProposalCard({ proposal, proposalId, propertyId, zone }: Props) {
  const [status, setStatus] = useState<CardStatus>('active');

  function handleConfirmPrompt() {
    if (status !== 'active') return;
    setStatus('confirming');
  }

  async function handleComplete() {
    if (status !== 'confirming') return;
    setStatus('loading');
    try {
      const res = await fetch(`/api/proposals/${proposalId}/complete`, { method: 'POST' });
      if (!res.ok) throw new Error('Request failed');
      setStatus('confirmed');
    } catch {
      // On failure, stay in confirming so user can retry without re-tapping "I did this"
      setStatus('confirming');
    }
  }

  if (status === 'confirmed') {
    return (
      <div className="border-border rounded-lg border bg-white p-5 sm:p-8">
        <p className="text-text text-[17px] leading-snug font-medium">
          {CATEGORY_LABELS[proposal.category]}
        </p>
        <p className="text-muted mt-2 text-[15px]">Your agent is watching.</p>
      </div>
    );
  }

  return (
    <div className="border-border rounded-lg border bg-white p-5 sm:p-8">
      {zone && <p className="text-muted mb-4 text-xs tracking-widest uppercase">Zone {zone}</p>}
      {proposal.title && (
        <p className="text-text text-base leading-snug font-medium">{proposal.title}</p>
      )}
      <p className="text-text mt-3 text-[15px] leading-relaxed">{proposal.summary}</p>
      <p className="text-muted mt-2 text-sm">{proposal.timing}</p>
      {proposal.product_suggestion && (
        <a
          href={`https://www.amazon.com/s?k=${encodeURIComponent(proposal.product_suggestion)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent mt-6 block text-sm underline-offset-2 hover:underline"
          onClick={() => {
            // Fire-and-forget — new tab opens normally, fetch logs the tap to Neon
            fetch('/api/interactions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                propertyId,
                proposalId,
                interactionType: 'commerce_click',
                interactionContext: 'proposal',
              }),
            }).catch(() => {});
          }}
        >
          {proposal.product_suggestion} →
        </a>
      )}
      {status === 'active' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleConfirmPrompt}
          className="rounded-button text-muted mt-6 min-h-11 w-full justify-start px-0"
        >
          I did this
        </Button>
      )}
      {(status === 'confirming' || status === 'loading') && (
        <div className="mt-6">
          <p className="text-muted text-sm">Mark as done?</p>
          <Button
            variant="ghost"
            size="sm"
            disabled={status === 'loading'}
            onClick={handleComplete}
            className="rounded-button text-accent mt-3 min-h-11 w-full justify-start px-0"
          >
            {status === 'loading' ? 'Saving…' : 'Done.'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={status === 'loading'}
            onClick={() => setStatus('active')}
            className="rounded-button text-muted mt-2 min-h-11 w-full justify-start px-0"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
