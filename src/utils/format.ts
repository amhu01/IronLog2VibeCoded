import { parseDateString } from './date';

export function formatWeight(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
}

export function formatDelta(n: number): string {
  const s = formatWeight(Math.abs(n));
  if (n > 0) return `+${s}`;
  if (n < 0) return `−${s}`;
  return '±0';
}

export function formatDateShort(date: string): string {
  return parseDateString(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatDateParts(date: string): { day: string; month: string; weekday: string } {
  const d = parseDateString(date);
  return {
    day: String(d.getDate()),
    month: d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase(),
    weekday: d.toLocaleDateString(undefined, { weekday: 'long' }),
  };
}
