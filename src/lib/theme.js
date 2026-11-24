// Theme preference: 'system' (default), 'light' or 'dark'.
// The class is first applied by an inline script in index.html (no flash on load);
// this module keeps it in sync afterwards and lets Settings change it.
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'gameday_theme';
const EVENT = 'gameday:theme';
const THEME_COLORS = { light: '#f97316', dark: '#0b1326' };

const media = () =>
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

export function getThemePreference() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function resolveTheme(pref = getThemePreference()) {
  if (pref === 'light' || pref === 'dark') return pref;
  return media()?.matches ? 'dark' : 'light';
}

export function applyTheme(pref = getThemePreference()) {
  const resolved = resolveTheme(pref);
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLORS[resolved]);
  return resolved;
}

export function setThemePreference(pref) {
  try {
    if (pref === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    // storage unavailable (private mode): still apply for this session
  }
  applyTheme(pref);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: pref }));
}

// Call once at startup: follows OS changes while the preference is 'system'.
export function initTheme() {
  applyTheme();
  media()?.addEventListener?.('change', () => {
    if (getThemePreference() === 'system') {
      applyTheme('system');
      window.dispatchEvent(new CustomEvent(EVENT, { detail: 'system' }));
    }
  });
}

// React hook: { preference, resolvedTheme, setPreference }
export function useTheme() {
  const [preference, setPref] = useState(getThemePreference);
  const [resolvedTheme, setResolved] = useState(() => resolveTheme());

  useEffect(() => {
    const sync = () => {
      setPref(getThemePreference());
      setResolved(resolveTheme());
    };
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);

  return { preference, resolvedTheme, setPreference: setThemePreference };
}
