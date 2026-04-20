'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// v1: zip code only — sufficient for regional inference (climate zone, grass type, soil approx).
// When parcel-level features ship (satellite imagery, lot size), upgrade to full address with
// server-side geocoding to lat/lng. Keep this component's interface simple enough to accept a
// lat/lng prop without a full rewrite. That's the only forward-compatibility work needed.
// Don't abstract it now — just leave the comment.

interface ZipScreenProps {
  onSubmit: (zip: string) => void;
}

export default function ZipScreen({ onSubmit }: ZipScreenProps) {
  const [zip, setZip] = useState('');
  const isValid = /^\d{5}$/.test(zip);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isValid) onSubmit(zip);
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 sm:px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
        <label htmlFor="zip" className="text-text block text-base">
          Your zip code
        </label>
        <Input
          id="zip"
          type="text"
          inputMode="numeric"
          pattern="\d{5}"
          maxLength={5}
          autoFocus
          autoComplete="postal-code"
          placeholder="00000"
          value={zip}
          onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
          className="rounded-button text-center text-lg tracking-widest"
        />
        <p className="text-muted text-sm">We&apos;ll use this to tell you what your lawn needs.</p>
        <Button type="submit" disabled={!isValid} className="rounded-button w-full">
          Continue
        </Button>
        <p className="text-muted text-xs">US zip codes only for now.</p>
      </form>
    </div>
  );
}
