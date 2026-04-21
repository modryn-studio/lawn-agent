// TODO(profile): AttributeCard doesn't yet handle locked attributes.
// When /profile is built, attributes with an empty value (e.g. soil_ph before a
// soil test) should render a distinct locked state — locked icon, muted label,
// instructional sublabel ("Get a soil test before we recommend amendments") —
// rather than a blank card. Pass an optional `locked?: true` prop here and
// render accordingly. The yard_properties row will have confidence_label='locked'
// or attribute_value='' as the signal.
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
