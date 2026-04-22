import Image from 'next/image';
import { site } from '@/config/site';
import HeroSignup from '@/components/hero-signup';

export default function Hero() {
  return (
    <section className="bg-bg flex min-h-svh flex-col md:flex-row">
      {/* Image -- shown first on mobile, right panel on desktop */}
      <div className="relative h-[45vh] w-full md:order-2 md:h-auto md:w-1/2">
        <Image
          src="/hero-image.webp"
          alt="A well-maintained lawn with rich green grass in warm afternoon light"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover object-center"
        />
      </div>

      {/* Copy */}
      <div className="relative flex w-full flex-col justify-start p-6 md:w-1/2 md:justify-center md:py-14 md:pr-12 md:pl-16">
        {/* Wordmark -- in-flow on mobile (first element, 24px from edges via block padding);
             absolute top-left on desktop so it doesn't affect vertical centering of H1+form */}
        <span className="font-heading text-text mb-6 text-base font-bold md:absolute md:top-8 md:left-8 md:mb-0 md:text-lg">
          {site.name}
        </span>

        <h1 className="font-heading text-text text-4xl font-normal tracking-tight md:text-[56px] md:leading-[1.1]">
          Your yard.
          <br />
          Figured out.
        </h1>

        <p className="text-text mt-4 max-w-md text-base leading-relaxed md:mt-6 md:text-lg">
          Stop researching. Stop guessing. Stop starting over every spring.
        </p>

        <HeroSignup />
      </div>
    </section>
  );
}
