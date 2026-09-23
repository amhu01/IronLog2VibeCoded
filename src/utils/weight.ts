const LB_TO_KG = 0.45359237;

export type WeightUnit = 'kg' | 'lb';

export interface ParsedWeight {
  value: number;
  unit: WeightUnit | null;
}

const NUMBER_RE = /[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)/;

/**
 * Weights are free text ("60", "60kg", "135 lbs", "BW"), so pull the number and
 * any unit out rather than trusting Number(), which yields NaN for "60KG".
 */
export function parseWeight(raw: number | string | null | undefined): ParsedWeight | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? { value: raw, unit: null } : null;

  const text = raw.trim();
  if (text === '') return null;
  const match = text.match(NUMBER_RE);
  if (!match) return null;
  const value = Number(match[0].replace(',', '.'));
  if (!Number.isFinite(value)) return null;

  const unit: WeightUnit | null = /lbs?\b|pound/i.test(text) ? 'lb' : /kgs?\b|kilo/i.test(text) ? 'kg' : null;
  return { value, unit };
}

/** Normalised to kg so mixed-unit entries still compare correctly. Unitless input is assumed kg. */
export function weightToKg(raw: number | string | null | undefined): number | null {
  const parsed = parseWeight(raw);
  if (!parsed) return null;
  return parsed.unit === 'lb' ? parsed.value * LB_TO_KG : parsed.value;
}

export function parseCount(raw: number | string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  const match = raw.trim().match(NUMBER_RE);
  if (!match) return null;
  const value = Number(match[0].replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}
