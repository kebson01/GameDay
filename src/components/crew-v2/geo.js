import { formatDistanceToNowStrict } from 'date-fns';

/** Great-circle distance in miles between two {lat,lng} points (null if either is missing). */
export function distanceMiles(a, b) {
  if (a?.lat == null || a?.lng == null || b?.lat == null || b?.lng == null) return null;
  const R = 3958.8;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** { value: '120', unit: 'ft' } / { value: '0.4', unit: 'mi' } */
export function distanceParts(mi) {
  if (mi == null || Number.isNaN(mi)) return null;
  if (mi < 0.1) return { value: String(Math.round(mi * 5280)), unit: 'ft' };
  return { value: mi < 10 ? mi.toFixed(1) : String(Math.round(mi)), unit: 'mi' };
}

/** Walking time at ~3 mph, rounded up; null when far enough that walking isn't sensible. */
export function walkMinutes(mi) {
  if (mi == null || mi > 3) return null;
  return Math.max(1, Math.ceil((mi / 3) * 60));
}

/** "5 min ago" from an ISO timestamp (null if invalid). */
export function agoLabel(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  if (Date.now() - d.getTime() < 60000) return 'just now';
  return `${formatDistanceToNowStrict(d)} ago`;
}
