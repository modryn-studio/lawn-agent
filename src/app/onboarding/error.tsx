'use client';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="bg-bg flex min-h-dvh flex-col items-center justify-center px-4">
      <p className="text-text text-base">Something went wrong.</p>
      <button
        type="button"
        onClick={reset}
        className="text-accent mt-4 text-sm underline"
      >
        Try again
      </button>
    </main>
  );
}