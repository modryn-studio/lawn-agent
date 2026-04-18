export default function ProposalCard() {
  return (
    <section className="bg-bg px-8 pt-16 pb-0 md:px-16 md:pt-20">
      <div className="mx-auto max-w-120">
        <div className="rounded-lg border border-(--color-text)/15 bg-white p-8">
          <p className="text-muted mb-4 text-xs tracking-widest uppercase">
            Example yard — Zone 6a, Northern US
          </p>
          <p className="text-text text-[15px] leading-relaxed">
            Your lawn is coming out of dormancy. Apply a slow-release nitrogen fertilizer this week
            — 0.5 lbs per 1,000 sq ft. Cool-season grass in your region is actively growing now and
            won&apos;t be again until fall. This is the window.
          </p>
          <p className="text-accent mt-6 text-sm">Scotts Turf Builder — 15,000 sq ft bag</p>
        </div>
      </div>
    </section>
  );
}
