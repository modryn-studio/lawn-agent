import Link from 'next/link';
import { site } from '@/config/site';

export default function Footer() {
  return (
    <footer className="border-border bg-bg border-t px-8 py-8 md:px-16">
      <div className="mx-auto flex max-w-2xl items-center gap-4">
        <p className="text-muted text-sm">
          © {new Date().getFullYear()} {site.name}
        </p>
        <span className="text-muted text-sm" aria-hidden="true">
          ·
        </span>
        <Link href="/privacy" className="text-muted hover:text-text text-sm transition-colors">
          Privacy
        </Link>
        <span className="text-muted text-sm" aria-hidden="true">
          ·
        </span>
        <Link href="/terms" className="text-muted hover:text-text text-sm transition-colors">
          Terms
        </Link>
      </div>
    </footer>
  );
}
