import { StyleSheet } from 'react-native';

/**
 * Colours are user-customisable (accent + background), so `colors`, `heat` and
 * `muscle` are mutated in place by applyTheme() and every stylesheet is built
 * through themed(), which rebuilds it when the theme version changes. Read them
 * at render time — never copy a colour into a module-level constant.
 */

export const ACCENTS = {
  orange: '#ff8a3d',
  red: '#ff5252',
  pink: '#ff5fa2',
  purple: '#a77bff',
  blue: '#4c9dff',
  teal: '#2fd4c4',
  lime: '#a3e05a',
  yellow: '#ffc53d',
} as const;
export type AccentName = keyof typeof ACCENTS;

interface Surfaces {
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceRaised: string;
  border: string;
  idle: string;
  neutral: string;
}

/** All dark on purpose: the share card's white text and the scrims assume a dark base. */
export const BACKGROUNDS: Record<string, Surfaces> = {
  dark: {
    background: '#0b0d12',
    surface: '#141821',
    surfaceAlt: '#1b202b',
    surfaceRaised: '#242a37',
    border: '#262d3a',
    idle: '#3a4252',
    neutral: '#262d3a',
  },
  black: {
    background: '#000000',
    surface: '#0c0c0e',
    surfaceAlt: '#151518',
    surfaceRaised: '#1e1e22',
    border: '#222227',
    idle: '#38383f',
    neutral: '#1e1e22',
  },
  navy: {
    background: '#070c1a',
    surface: '#0f1729',
    surfaceAlt: '#162036',
    surfaceRaised: '#1f2b45',
    border: '#22304d',
    idle: '#344466',
    neutral: '#1f2b45',
  },
  plum: {
    background: '#0f0a14',
    surface: '#18111f',
    surfaceAlt: '#21182b',
    surfaceRaised: '#2c2138',
    border: '#30243d',
    idle: '#463857',
    neutral: '#2c2138',
  },
};
export type BackgroundName = keyof typeof BACKGROUNDS;

function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export const colors = {
  background: '',
  surface: '',
  surfaceAlt: '',
  surfaceRaised: '',
  border: '',
  text: '#f4f5f7',
  textMuted: '#8e97a6',
  textFaint: '#5b6572',
  primary: '',
  primarySoft: '',
  primaryText: '#111216',
  danger: '#ff5d6c',
  dangerSoft: 'rgba(255, 93, 108, 0.14)',
  success: '#3fd39a',
  successSoft: 'rgba(63, 211, 154, 0.14)',
};

/** Calendar heatmap intensity, from a rest day up to the busiest day in view. */
export const heat: string[] = [];

/** Muscle map: an untrained muscle, and non-muscle parts (head, hands, knees, feet). */
export const muscle = { idle: '', neutral: '' };

let version = 0;

export function applyTheme(accent: AccentName, background: BackgroundName) {
  const surfaces = BACKGROUNDS[background] ?? BACKGROUNDS.dark;
  const hot = ACCENTS[accent] ?? ACCENTS.orange;
  Object.assign(colors, {
    background: surfaces.background,
    surface: surfaces.surface,
    surfaceAlt: surfaces.surfaceAlt,
    surfaceRaised: surfaces.surfaceRaised,
    border: surfaces.border,
    primary: hot,
    primarySoft: rgba(hot, 0.16),
  });
  heat.splice(0, heat.length, surfaces.surfaceAlt, rgba(hot, 0.28), rgba(hot, 0.5), rgba(hot, 0.75), hot);
  muscle.idle = surfaces.idle;
  muscle.neutral = surfaces.neutral;
  version += 1;
}

applyTheme('orange', 'dark');

/**
 * A stylesheet that follows the current theme: built on first use and rebuilt
 * after applyTheme(). Use it exactly like StyleSheet.create, with the styles
 * wrapped in a function so colour lookups happen at build time.
 */
export function themed<T extends StyleSheet.NamedStyles<T>>(build: () => T): T {
  let built: T | null = null;
  let builtFor = -1;
  const current = () => {
    if (builtFor !== version) {
      built = StyleSheet.create(build());
      builtFor = version;
    }
    return built!;
  };
  return new Proxy({} as T, { get: (_, key) => current()[key as keyof T] });
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  pill: 999,
};

export const fontSize = {
  title: 30,
  h2: 20,
  h3: 16,
  body: 15,
  small: 13,
  tiny: 11,
};
