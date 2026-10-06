import { MS, MS_MUSCLES } from './ms';

export type Language = 'en' | 'ms';

let language: Language = 'en';

export function setLanguage(next: Language) {
  language = next;
}

export function getLanguage(): Language {
  return language;
}

/**
 * Translate UI text. The English text is its own key, so untranslated strings
 * simply fall back to English. `{name}` placeholders are filled from `vars`.
 * Read at render time — never store a translated string in a module constant.
 */
export function t(text: string, vars?: Record<string, string | number>): string {
  const out = language === 'ms' ? MS[text] ?? text : text;
  return vars ? out.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? '')) : out;
}

/** `tn(3, '{n} set', '{n} sets')` — English picks by count; Malay has no plural form. */
export function tn(n: number, one: string, many: string, vars?: Record<string, string | number>): string {
  return t(n === 1 ? one : many, { n, ...vars });
}

/** Muscle groups are stored in English (data, backups and the map key off them); only the label changes. */
export function muscleLabel(group: string): string {
  return language === 'ms' ? MS_MUSCLES[group] ?? group : group;
}

/** Locale for toLocaleDateString; undefined = the phone's own. */
export function dateLocale(): string | undefined {
  return language === 'ms' ? 'ms-MY' : undefined;
}

const MONTHS_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MONTHS_MS = ['JAN', 'FEB', 'MAC', 'APR', 'MEI', 'JUN', 'JUL', 'OGO', 'SEP', 'OKT', 'NOV', 'DIS'];

export function monthShort(index: number): string {
  return (language === 'ms' ? MONTHS_MS : MONTHS_EN)[index];
}

/** Monday-first single-letter labels for heatmap rows (Mon, Wed, Fri, Sun shown). */
export function weekdayInitials(): string[] {
  return language === 'ms' ? ['I', '', 'R', '', 'J', '', 'A'] : ['M', '', 'W', '', 'F', '', 'S'];
}
