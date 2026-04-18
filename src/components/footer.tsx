import { site } from '@/config/site';

export default function Footer() {
  return (
    <footer className="border-border bg-bg border-t px-8 py-8 md:px-16">
      <div className="mx-auto max-w-2xl">
        <p className="text-muted text-sm">
          © {new Date().getFullYear()} {site.name}
        </p>
      </div>
    </footer>
  );
}
