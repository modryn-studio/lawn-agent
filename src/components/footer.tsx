import Link from 'next/link';
import { site } from '@/config/site';

export default function Footer() {
  return (
    <footer className="border-border bg-bg border-t px-8 py-8 md:px-16">
      <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-x-4 gap-y-2">
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
        <span className="text-muted text-sm" aria-hidden="true">
          ·
        </span>
        <span className="text-muted text-sm">Built by Luke</span>
        <span className="text-muted text-sm" aria-hidden="true">
          ·
        </span>
        <a
          href="mailto:hello@lawnagent.app"
          className="text-muted hover:text-text text-sm transition-colors"
        >
          hello@lawnagent.app
        </a>
      </div>
    </footer>
  );
}
