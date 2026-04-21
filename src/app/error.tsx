'use client';
import { Button } from '@/components/ui/button';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4">
      <p className="text-text text-base">Something went wrong.</p>
      <Button
        type="button"
        variant="ghost"
        onClick={reset}
        className="rounded-button text-accent mt-4 text-sm underline"
      >
        Try again
      </Button>
    </main>
  );
}
