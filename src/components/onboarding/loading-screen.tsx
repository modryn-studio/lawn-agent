'use client';

import { useEffect, useRef, useState } from 'react';

const MESSAGES = [
  'Reading your zone.',
  'Checking soil temps.',
  'Building your first proposal.',
] as const;

// Messages 1 and 2 hold ~5 seconds each. Message 3 holds until the parent resolves.
const HOLD_MS = 5000;

export default function LoadingScreen() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const innerTimer = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    // Don't auto-advance past message 3 — parent controls transition
    if (index >= MESSAGES.length - 1) return;

    const timer = setTimeout(() => {
      setVisible(false);
      // After fade-out, advance and fade-in
      innerTimer.current = setTimeout(() => {
        setIndex((i) => Math.min(i + 1, MESSAGES.length - 1));
        setVisible(true);
      }, 200);
    }, HOLD_MS);

    return () => {
      clearTimeout(timer);
      if (innerTimer.current) clearTimeout(innerTimer.current);
    };
  }, [index]);

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 sm:px-6">
      <p
        className="text-text text-base transition-opacity duration-200"
        style={{ opacity: visible ? 1 : 0 }}
      >
        {MESSAGES[index]}
      </p>
    </div>
  );
}
