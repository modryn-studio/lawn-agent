'use client';

import { useEffect, useRef, useState } from 'react';

const MESSAGES = [
  'Reading your zone.',
  'Checking soil temps.',
  'Building your first proposal.',
] as const;

// Messages 1 and 2 hold 2.5s each → message 3 appears at ~5.2s.
// Fastest observed call is ~6.9s, so message 3 is always visible before the proposal arrives.
const HOLD_MS = 2500;

// Minimum time message 3 must be visible before the parent may advance.
// Guards against future calls faster than 5.2s skipping the final message entirely.
const MESSAGE3_MIN_MS = 1000;

interface LoadingScreenProps {
  onMessage3Ready?: () => void;
}

export default function LoadingScreen({ onMessage3Ready }: LoadingScreenProps) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const innerTimer = useRef<ReturnType<typeof setTimeout>>(null);
  // Keep callback ref so the effect doesn't need it as a dependency
  const onReadyRef = useRef(onMessage3Ready);
  onReadyRef.current = onMessage3Ready;

  useEffect(() => {
    if (index >= MESSAGES.length - 1) {
      // Message 3 is visible — wait minimum display time then signal parent
      const minTimer = setTimeout(() => {
        onReadyRef.current?.();
      }, MESSAGE3_MIN_MS);
      return () => clearTimeout(minTimer);
    }

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
