import { site } from '@/config/site';

export default function Footer() {
  return (
    <footer className="border-border bg-bg border-t px-8 py-8 md:px-16">
      <div className="mx-auto flex max-w-2xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted text-sm">
          © {new Date().getFullYear()} {site.name} ·{' '}
          <a
            href="https://modrynstudio.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text transition-colors"
          >
            Modryn Studio
          </a>
        </p>
        <div className="flex gap-4">
          <a
            href={site.social.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted hover:text-text text-sm transition-colors"
          >
            X
          </a>
          <a
            href={site.social.github}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted hover:text-text text-sm transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
