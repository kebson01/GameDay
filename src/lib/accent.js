// App accent color: 'orange' (GameDay Orange, default), 'neutral' (steel blue)
// or 'team' (a followed team's primary color, its alternate as secondary).
//
// Every `orange-*` and `brand*` Tailwind class reads CSS RGB variables
// (src/styles/theme-colors.css, src/index.css). For 'orange' we remove our
// inline overrides so the stylesheet values apply unchanged. For other modes we
// generate a 50-950 ramp in OKLCH and set the variables on <html>, clamping each
// shade's luminance per theme so accent text and white-on-accent fills stay
// readable on both the light surface and the dark navy surface.
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'gameday_accent';
const EVENT = 'gameday:accent';
const THEME_EVENT = 'gameday:theme';
const SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

export const ACCENT_DEFAULT = { mode: 'orange' };
export const ORANGE = { primary: '#f97316', secondary: '#fbbf24' };
export const NEUTRAL = { primary: '#2b6cb0', secondary: '#7dd3fc' };

// ---------------------------------------------------------------------------
// Color math (sRGB <-> OKLCH, WCAG luminance)
// ---------------------------------------------------------------------------
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLin = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function hexToRgb(hex) {
  const h = String(hex || '').replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map(x => x + x).join('') : h;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16));
}
const rgbToHex = (rgb) => '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('');
export const normalizeHex = (hex) => { const rgb = hexToRgb(hex); return rgb ? rgbToHex(rgb) : null; };

function linToOklab([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
function oklabToLin([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}
function rgbToOklch(rgb) {
  const [L, a, b] = linToOklab(rgb.map(v => toLin(v / 255)));
  return { L, C: Math.hypot(a, b), h: Math.atan2(b, a) };
}
const inGamut = (lin) => lin.every(v => v >= -1e-4 && v <= 1 + 1e-4);
const lchToLin = (L, C, h) => oklabToLin([L, C * Math.cos(h), C * Math.sin(h)]);

// Linear RGB for (L, h) with the largest chroma <= C that fits in sRGB
function fitChroma(L, C, h) {
  let lin = lchToLin(L, C, h);
  if (inGamut(lin)) return lin;
  let lo = 0;
  let hi = C;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(lchToLin(L, mid, h))) lo = mid; else hi = mid;
  }
  lin = lchToLin(L, lo, h);
  return lin;
}
const linToRgb = (lin) => lin.map(v => Math.round(fromLin(clamp01(v)) * 255));
const lumOfLin = ([r, g, b]) => 0.2126 * clamp01(r) + 0.7152 * clamp01(g) + 0.0722 * clamp01(b);
export const luminance = (rgb) => lumOfLin(rgb.map(v => toLin(v / 255)));
export const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// A color with the hue/chroma of `lch` whose luminance lies in [yMin, yMax]:
// unchanged if it already does, else lightness moved to the nearest bound.
function fitLuminance(lch, yMin, yMax, chromaScale = 1) {
  const C = lch.C * chromaScale;
  const at = (L) => fitChroma(L, C, lch.h);
  const y0 = lumOfLin(at(lch.L));
  if (y0 >= yMin && y0 <= yMax) return linToRgb(at(lch.L));
  const target = y0 < yMin ? yMin : yMax;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (lumOfLin(at(mid)) < target) lo = mid; else hi = mid;
  }
  return linToRgb(at(y0 < yMin ? hi : lo));
}
const atLightness = (lch, L, chromaScale) => linToRgb(fitChroma(L, lch.C * chromaScale, lch.h));
const mix = (a, b, t) => a.map((v, i) => Math.round(v * t + b[i] * (1 - t)));

function rgbToHsl([r, g, b]) {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === R) h = (G - B) / d + (G < B ? 6 : 0);
    else if (max === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
    h *= 60;
  }
  return `${h.toFixed(1)} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%`;
}

// ---------------------------------------------------------------------------
// Palette generation
// ---------------------------------------------------------------------------
const CARD_DARK = [23, 31, 51]; // #171f33, matches scripts/generate-theme-colors.cjs

/** Near black, near white or grey: not usable as an accent */
export function isWeakColor(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return true;
  const { L, C } = rgbToOklch(rgb);
  return C < 0.045 || L < 0.17 || L > 0.96;
}

/** Pick the accent pair for a team: primary unless it is black/white/grey. */
export function teamAccentColors(color, altColor) {
  const p = normalizeHex(color);
  const a = normalizeHex(altColor);
  if (p && !isWeakColor(p)) return { primary: p, secondary: a && !isWeakColor(a) ? a : null };
  if (a && !isWeakColor(a)) return { primary: a, secondary: p && !isWeakColor(p) ? p : null };
  return { ...NEUTRAL };
}

/**
 * CSS variables (RGB channel strings, HSL for shadcn) for one theme.
 * Light: 500/brand <= 0.18 luminance (>= 4.5:1 with white text and on white),
 * 600 and deeper darker still; text uses the same colors. Dark: fills (brand,
 * 500, 600) sit at 0.14-0.18 luminance for white labels, while text-brand and
 * text-orange-500/600 switch to a lighter 0.30-0.42 tone that reads on navy.
 */
export function buildAccentVars(primary, secondary, theme) {
  const rgb = hexToRgb(primary) || hexToRgb(NEUTRAL.primary);
  const base = rgbToOklch(rgb);
  // Deep, muted colors (navy, maroon) turn greyish when lightened for dark mode: add chroma back
  const vivid = Math.min(1.6, Math.max(1, 0.13 / Math.max(base.C, 0.01)));
  const s = {};

  // Light-theme ramp (also reused for the dark theme's 800-950 text shades)
  const l500 = fitLuminance(base, 0.045, 0.18);
  const y500 = luminance(l500);
  const l600 = fitLuminance(base, 0.025, Math.min(0.13, y500 * 0.72));
  const y600 = luminance(l600);
  const l700 = fitLuminance(base, 0.014, Math.min(0.085, y600 * 0.66), 0.95);
  const y700 = luminance(l700);
  const l800 = fitLuminance(base, 0.009, Math.min(0.055, y700 * 0.66), 0.85);
  const y800 = luminance(l800);
  const l900 = fitLuminance(base, 0.006, Math.min(0.036, y800 * 0.68), 0.75);
  const l950 = fitLuminance(base, 0.003, Math.min(0.02, luminance(l900) * 0.6), 0.65);
  const l400 = fitLuminance(base, Math.max(0.24, y500 * 1.8), 0.42);
  const light = {
    50: atLightness(base, 0.975, 0.12),
    100: atLightness(base, 0.945, 0.27),
    200: atLightness(base, 0.895, 0.5),
    300: atLightness(base, 0.825, 0.75),
    400: l400, 500: l500, 600: l600, 700: l700, 800: l800, 900: l900, 950: l950,
  };

  let ramp;
  let brand;
  let soft;
  let text;
  if (theme === 'dark') {
    // Fills (white labels): 0.14-0.18 luminance = 4.6-5.5:1 with white, ~3:1 vs the card.
    // Text: 0.30-0.42 = 6:1+ on the navy surface and 5.4:1+ on cards.
    const d500 = fitLuminance(base, 0.14, 0.18, vivid);
    const d400 = fitLuminance(base, 0.3, 0.42, vivid);
    text = d400;
    soft = fitLuminance(base, 0.47, 0.6, 0.8 * vivid);
    ramp = {
      50: mix(d500, CARD_DARK, 0.14),
      100: mix(d500, CARD_DARK, 0.22),
      200: mix(d500, CARD_DARK, 0.32),
      300: mix(d400, CARD_DARK, 0.5),
      400: d400,
      500: d500,
      600: d500,
      700: fitLuminance(base, 0.47, 0.62, 0.85 * vivid),
      800: light[200],
      900: light[100],
      950: light[50],
    };
    brand = d500;
  } else {
    ramp = light;
    brand = l500;
    soft = l600;
    text = null; // light theme: text colors equal the fills
  }

  const secRgb = hexToRgb(secondary) || light[300];
  const sec = fitLuminance(rgbToOklch(secRgb), 0.05, 0.62);
  const onDark = fitLuminance(base, 0.47, 0.6, 0.8 * vivid);

  for (const k of SHADES) s[`--c-orange-${k}`] = ramp[k].join(' ');
  s['--gd-brand'] = brand.join(' ');
  s['--gd-brand-soft'] = soft.join(' ');
  s['--gd-brand-alt'] = sec.join(' ');
  s['--gd-brand-ondark'] = onDark.join(' ');
  s['--gd-brand-text'] = (text || brand).join(' ');
  s['--c-orange-t500'] = (text || ramp[500]).join(' ');
  s['--c-orange-t600'] = (text || ramp[600]).join(' ');
  const primaryHsl = rgbToHsl(brand);
  s['--primary'] = primaryHsl;
  s['--ring'] = primaryHsl;
  s['--chart-1'] = primaryHsl;
  s['--sidebar-primary'] = primaryHsl;
  s['--sidebar-ring'] = primaryHsl;
  if (theme === 'dark') s['--accent-foreground'] = rgbToHsl(soft);
  else {
    s['--accent'] = rgbToHsl(light[50]);
    s['--accent-foreground'] = rgbToHsl(light[700]);
  }
  return { vars: s, brandHex: rgbToHex(brand) };
}

const VAR_NAMES = [
  ...SHADES.map(k => `--c-orange-${k}`),
  '--gd-brand', '--gd-brand-soft', '--gd-brand-alt', '--gd-brand-ondark',
  '--gd-brand-text', '--c-orange-t500', '--c-orange-t600',
  '--primary', '--ring', '--chart-1', '--sidebar-primary', '--sidebar-ring', '--accent', '--accent-foreground',
];

// ---------------------------------------------------------------------------
// Preference storage + application
// ---------------------------------------------------------------------------
function sanitize(v) {
  if (!v || typeof v !== 'object') return { ...ACCENT_DEFAULT };
  if (v.mode === 'neutral') return { mode: 'neutral' };
  if (v.mode === 'team' && v.team && normalizeHex(v.primary)) {
    return { mode: 'team', team: String(v.team), primary: normalizeHex(v.primary), secondary: normalizeHex(v.secondary) };
  }
  return { ...ACCENT_DEFAULT };
}

export function getAccentPreference() {
  try {
    return sanitize(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'));
  } catch {
    return { ...ACCENT_DEFAULT };
  }
}

/** The two colors shown for a preference (swatches, header gradient) */
export function accentColors(pref = getAccentPreference()) {
  if (pref.mode === 'neutral') return NEUTRAL;
  if (pref.mode === 'team') return { primary: pref.primary, secondary: pref.secondary || pref.primary };
  return ORANGE;
}

export function applyAccent(pref = getAccentPreference()) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const dark = root.classList.contains('dark');
  VAR_NAMES.forEach(n => root.style.removeProperty(n));
  delete root.dataset.accent;
  if (pref.mode === 'orange') return; // stylesheet defaults: GameDay Orange
  const { primary, secondary } = pref.mode === 'neutral' ? NEUTRAL : pref;
  const { vars, brandHex } = buildAccentVars(primary, secondary, dark ? 'dark' : 'light');
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.dataset.accent = pref.mode;
  if (!dark) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', brandHex);
}

export function setAccentPreference(next, { fromCloud = false } = {}) {
  const pref = sanitize(next);
  try {
    if (pref.mode === 'orange') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(pref));
  } catch {
    // storage unavailable: still apply for this session
  }
  applyAccent(pref);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { preference: pref, fromCloud } }));
}

export const sameAccent = (a, b) => JSON.stringify(sanitize(a)) === JSON.stringify(sanitize(b));

// Call once at startup, after initTheme(): re-applies when light/dark changes.
export function initAccent() {
  applyAccent();
  window.addEventListener(THEME_EVENT, () => applyAccent());
}

// React hook: { accent, setAccent }
export function useAccent() {
  const [accent, setState] = useState(getAccentPreference);
  useEffect(() => {
    const sync = () => setState(getAccentPreference());
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  return { accent, setAccent: setAccentPreference };
}
