import HeroSignup from '@/components/hero-signup';

export default function EarlyAccess() {
  return (
    <section className="bg-bg px-8 py-20 md:px-16 md:py-28">
      <div className="mx-auto max-w-2xl">
        <p className="font-heading text-text text-3xl tracking-tight md:text-[40px] md:leading-[1.15]">
          Get early access.
        </p>
        <HeroSignup inputId="access-email" />
      </div>
    </section>
  );
}
