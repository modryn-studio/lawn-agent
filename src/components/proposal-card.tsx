export default function ProposalCard() {
  return (
    <section className="bg-bg px-4 pt-16 pb-0 sm:px-6 md:px-16 md:pt-20">
      <div className="mx-auto max-w-120">
        <div className="border-border rounded-lg border bg-white p-5 sm:p-8">
          <p className="text-muted mb-4 text-xs tracking-widest uppercase">
            Example yard — Zone 6a, Central US
          </p>
          <p className="text-text text-base leading-snug font-medium">
            Fertilize Now — Peak Spring Growth Window
          </p>
          <p className="text-text mt-3 text-[15px] leading-relaxed">
            Your cool-season lawn is actively growing. This is the highest-impact fertilizer
            application of the year — apply now and the grass thickens before summer heat shuts it
            down.
          </p>
          <p className="text-accent mt-6 text-sm">Scotts Turf Builder 32-0-4 — 15,000 sq ft bag</p>
        </div>
      </div>
    </section>
  );
}
