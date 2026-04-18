import { z } from 'zod';

// ── Proposal output schema ────────────────────────────────────────────────────
// Defines what claude-sonnet-4-6 must return. Stored verbatim in proposals.content.
export const proposalSchema = z.object({
  title: z.string().describe('Short action-oriented title (5–8 words)'),
  summary: z
    .string()
    .describe('1–2 sentence description of what to do and why, written for a non-expert homeowner'),
  rationale: z
    .string()
    .describe('Why this is the right action for this yard right now, given the data'),
  category: z.enum([
    'fertilization',
    'weed_control',
    'overseeding',
    'aeration',
    'watering',
    'pest_control',
    'soil_amendment',
    'mowing',
    'other',
  ]),
  priority: z.enum(['high', 'medium', 'low']),
  timing: z
    .string()
    .describe('When to take this action, e.g. "Within the next 2 weeks" or "This fall"'),
  product_suggestion: z
    .string()
    .nullable()
    .describe('Specific product name if applicable, null if no product needed'),
  commerce_url: z
    .string()
    .nullable()
    .describe('Amazon or home improvement store URL for the product, null if not applicable'),
  estimated_cost_usd: z
    .number()
    .nullable()
    .describe('Rough cost estimate in USD, null if not applicable'),
  attribute_keys_affected: z
    .array(z.string())
    .describe('Yard attribute keys this proposal directly addresses'),
});

export type ProposalContent = z.infer<typeof proposalSchema>;

// ── Context block types (from design doc) ────────────────────────────────────
export interface AttributeContext {
  key: string;
  value: string;
  unit: string | null;
  confidence: number;
  label: string;
  source: string;
  isLocked: boolean;
  interactionCount: number;
}

type DataMaturity = 'new' | 'partial' | 'mature';

export interface ContextBlock {
  highConfidence: AttributeContext[];
  mediumConfidence: AttributeContext[];
  lowConfidence: AttributeContext[];
  lockedAttributes: AttributeContext[];
  totalAttributes: number;
  confirmedCount: number;
  dataMaturity: DataMaturity;
}

export function buildContextBlock(rows: Record<string, unknown>[]): ContextBlock {
  const allAttrs: AttributeContext[] = rows.map((r) => ({
    key: r.attribute_key as string,
    value: r.attribute_value as string,
    unit: (r.value_unit as string | null) ?? null,
    confidence: parseFloat(r.confidence_score as string),
    label: r.confidence_label as string,
    source: r.source as string,
    isLocked: r.is_locked as boolean,
    interactionCount:
      (parseInt(r.confirm_count as string, 10) || 0) +
      (parseInt(r.correct_count as string, 10) || 0),
  }));

  const locked = allAttrs.filter((a) => a.isLocked);
  const unlocked = allAttrs.filter((a) => !a.isLocked);

  const confirmedCount = allAttrs.filter(
    (a) => a.label === 'confirmed' || a.label === 'corrected'
  ).length;

  let dataMaturity: DataMaturity = 'new';
  if (confirmedCount > 6) dataMaturity = 'mature';
  else if (confirmedCount >= 3) dataMaturity = 'partial';

  return {
    highConfidence: unlocked.filter((a) => a.confidence >= 0.8),
    mediumConfidence: unlocked.filter((a) => a.confidence >= 0.5 && a.confidence < 0.8),
    lowConfidence: unlocked.filter((a) => a.confidence < 0.5),
    lockedAttributes: locked,
    totalAttributes: allAttrs.length,
    confirmedCount,
    dataMaturity,
  };
}

/**
 * Also accepts AttributeContext[] directly for onboarding flow where
 * attributes come from inference rather than DB rows.
 */
export function buildContextBlockFromAttributes(attrs: AttributeContext[]): ContextBlock {
  const locked = attrs.filter((a) => a.isLocked);
  const unlocked = attrs.filter((a) => !a.isLocked);

  const confirmedCount = attrs.filter(
    (a) => a.label === 'confirmed' || a.label === 'corrected'
  ).length;

  let dataMaturity: DataMaturity = 'new';
  if (confirmedCount > 6) dataMaturity = 'mature';
  else if (confirmedCount >= 3) dataMaturity = 'partial';

  return {
    highConfidence: unlocked.filter((a) => a.confidence >= 0.8),
    mediumConfidence: unlocked.filter((a) => a.confidence >= 0.5 && a.confidence < 0.8),
    lowConfidence: unlocked.filter((a) => a.confidence < 0.5),
    lockedAttributes: locked,
    totalAttributes: attrs.length,
    confirmedCount,
    dataMaturity,
  };
}

// Serialize context block into the exact prompt format from the design doc.
// Consistency here matters: changing this format requires updating the system prompt.
export function serializeContextBlock(propertyId: string, block: ContextBlock): string {
  const ts = new Date().toISOString();
  const lines: string[] = [
    `YARD CONTEXT — ${propertyId} — ${ts}`,
    `Data maturity: ${block.dataMaturity} (${block.confirmedCount} confirmed / ${block.totalAttributes} total)`,
    '',
  ];

  if (block.highConfidence.length > 0) {
    lines.push('CONFIRMED (high confidence — treat as facts):');
    for (const a of block.highConfidence) {
      const unit = a.unit ? ` ${a.unit}` : '';
      const interactions =
        a.interactionCount > 0
          ? `, ${a.interactionCount} interaction${a.interactionCount !== 1 ? 's' : ''}`
          : '';
      lines.push(`- ${a.key}: ${a.value}${unit} (${a.label}${interactions})`);
    }
    lines.push('');
  }

  if (block.mediumConfidence.length > 0) {
    lines.push('LIKELY (medium confidence — use with hedging language):');
    for (const a of block.mediumConfidence) {
      const unit = a.unit ? ` ${a.unit}` : '';
      lines.push(`- ${a.key}: ${a.value}${unit} (${a.label} from ${a.source})`);
    }
    lines.push('');
  }

  if (block.lowConfidence.length > 0) {
    lines.push('ASSUMED (low confidence — flag uncertainty to user):');
    for (const a of block.lowConfidence) {
      const unit = a.unit ? ` ${a.unit}` : '';
      lines.push(`- ${a.key}: ${a.value}${unit} (assumed from ${a.source}, not verified)`);
    }
    lines.push('');
  }

  if (block.lockedAttributes.length > 0) {
    lines.push('REQUIRES ACTION BEFORE RECOMMENDATION (locked — do not propose without):');
    for (const a of block.lockedAttributes) {
      const valueDisplay = a.value || '[not measured]';
      lines.push(
        `- ${a.key}: ${valueDisplay} — recommend appropriate test or measurement before proposing`
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}

export const SYSTEM_PROMPT = `You are a practical lawn care advisor. Your job is to produce one single, actionable proposal for a homeowner based on their yard data.

Rules:
- Propose only one action. The most impactful one given the current data.
- Write for someone who is not a lawn expert. Plain language only.
- Never use: "powerful", "seamless", "revolutionary", "AI-powered", "next-level", "smart", "intelligent".
- Be honest about what you don't know. If data is low-confidence, say so in the rationale.
- "Yard" = whole property (emotional). "Lawn" = grass specifically (actionable). Do not collapse.
- Locked attributes must not be assumed. If soil_ph is locked, do not propose lime or pH amendments — propose getting a soil test instead.
- commerce_url must be a real, working product URL (Amazon, Home Depot, Lowe's). If you cannot produce a reliable URL, set it to null.
- Do not hallucinate product names. If you are not confident in a specific product, set product_suggestion and commerce_url to null.`;
