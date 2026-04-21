'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const MESSAGES = [
  'Reading your zone.',
  'Checking soil temps.',
  'Checking this week\u2019s weather.',
  'Building your first proposal.',
] as const;

// 3 transitions × 2s + 3 × 200ms crossfade ≈ 6.6s before message 4 appears.
// Typical call with weather integration is ~16s, so message 4 holds ~9s before advancing.
// That's at the edge — keep an eye on p50 latency and reduce hold if calls get faster.
const HOLD_MS = 2000;

// Minimum time the final message must be visible before the parent may advance.
// Guards against fast API responses skipping the last message entirely.
const LAST_MESSAGE_MIN_MS = 1000;

interface LoadingScreenProps {
  onLastMessageReady?: () => void;
}

export default function LoadingScreen({ onLastMessageReady }: LoadingScreenProps) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const innerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep callback ref so the effect doesn't need it as a dependency.
  // useLayoutEffect ensures the ref is current before any post-paint effects fire.
  const onReadyRef = useRef(onLastMessageReady);
  useLayoutEffect(() => {
    onReadyRef.current = onLastMessageReady;
  });

  useEffect(() => {
    if (index >= MESSAGES.length - 1) {
      // Final message is visible — wait minimum display time then signal parent
      const minTimer = setTimeout(() => {
        onReadyRef.current?.();
      }, LAST_MESSAGE_MIN_MS);
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
