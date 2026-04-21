interface AttributeCardProps {
  label: string;
  sublabel: string;
}

export function AttributeCard({ label, sublabel }: AttributeCardProps) {
  return (
    <li className="border-border bg-surface rounded-lg border px-5 py-4">
      <p className="text-text text-[15px] leading-relaxed">{label}</p>
      <p className="text-muted mt-1 text-xs">{sublabel}</p>
    </li>
  );
}
