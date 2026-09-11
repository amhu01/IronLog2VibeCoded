export function dateToString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayString(): string {
  return dateToString(new Date());
}

export function parseDateString(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function formatDateDisplay(date: string): string {
  return parseDateString(date).toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
