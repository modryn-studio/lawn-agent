import Image from 'next/image';
import { site } from '@/config/site';
import HeroSignup from '@/components/hero-signup';

export default function Hero() {
  return (
    <section className="bg-bg flex min-h-dvh flex-col md:flex-row">
      {/* Image -- shown first on mobile, right panel on desktop */}
      <div className="relative h-[40vh] w-full md:order-2 md:h-auto md:w-1/2">
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
      <div className="relative flex w-full flex-col justify-center px-4 py-10 md:w-1/2 md:py-14 md:pr-12 md:pl-16">
        {/* Wordmark -- 32px from top-left of panel, not in content flow */}
        <span className="font-heading text-text absolute top-8 left-8 text-lg font-bold">
          {site.name}
        </span>

        <h1 className="font-heading text-text text-4xl font-normal tracking-tight md:text-[56px] md:leading-[1.1]">
          Your yard.
          <br />
          Figured out.
        </h1>

        <p className="text-text mt-6 max-w-md text-lg leading-relaxed">
          Stop researching. Stop guessing. Stop starting over every spring.
        </p>

        <HeroSignup />
      </div>
    </section>
  );
}
