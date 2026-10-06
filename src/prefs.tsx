import React, { createContext, useContext } from 'react';
import { getSettings, setSetting } from './db/repository';
import { setLanguage, type Language } from './i18n';
import { ACCENTS, BACKGROUNDS, applyTheme, type AccentName, type BackgroundName } from './theme';

export interface Prefs {
  language: Language;
  accent: AccentName;
  background: BackgroundName;
}

export const DEFAULT_PREFS: Prefs = { language: 'en', accent: 'orange', background: 'dark' };

function sanitize(raw: Record<string, string>): Prefs {
  return {
    language: raw.language === 'ms' ? 'ms' : 'en',
    accent: raw.accent && raw.accent in ACCENTS ? (raw.accent as AccentName) : DEFAULT_PREFS.accent,
    background: raw.background && raw.background in BACKGROUNDS ? raw.background : DEFAULT_PREFS.background,
  };
}

/** Make the globals (theme colours, UI language) match these prefs. Callers then redraw the app. */
export function applyPrefs(prefs: Prefs) {
  applyTheme(prefs.accent, prefs.background);
  setLanguage(prefs.language);
}

/** Read saved prefs (falling back to defaults for anything missing or unknown) and apply them. */
export async function loadPrefs(): Promise<Prefs> {
  const prefs = sanitize(await getSettings());
  applyPrefs(prefs);
  return prefs;
}

export async function savePrefs(prefs: Prefs): Promise<void> {
  await setSetting('language', prefs.language);
  await setSetting('accent', prefs.accent);
  await setSetting('background', prefs.background);
}

interface PrefsContextValue {
  prefs: Prefs;
  update: (change: Partial<Prefs>) => void;
}

export const PrefsContext = createContext<PrefsContextValue>({ prefs: DEFAULT_PREFS, update: () => {} });

export function usePrefs(): PrefsContextValue {
  return useContext(PrefsContext);
}
