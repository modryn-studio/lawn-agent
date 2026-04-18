export default function HowItWorks() {
  return (
    <section className="bg-bg px-8 pt-16 pb-20 md:px-16 md:pt-20 md:pb-28">
      <div className="mx-auto max-w-2xl">
        <p className="text-muted mb-8 text-sm tracking-widest uppercase">How it works</p>
        <p className="font-heading text-text text-3xl tracking-tight md:text-[40px] md:leading-[1.15]">
          Enter your address. That&apos;s it.
        </p>
        <p className="text-text mt-6 text-lg leading-relaxed">
          Lawn Agent pulls your climate, your soil, your grass type, and your season. It tells you
          what your lawn needs right now — and what to do about it. No setup wizard. No
          questionnaire. No expertise required.
        </p>
        <div className="mt-8 space-y-3">
          <p className="text-text text-lg">
            When your pre-emergent window opens, you&apos;ll know.
          </p>
          <p className="text-text text-lg">When it&apos;s time to overseed, you&apos;ll know.</p>
          <p className="text-text text-lg">When something&apos;s off, you&apos;ll know.</p>
        </div>
      </div>
    </section>
  );
}
