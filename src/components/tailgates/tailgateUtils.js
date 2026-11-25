import { parseISO, isToday, isTomorrow, format } from 'date-fns';

export const TAILGATE_TYPES = [
  { value: 'open', label: 'Open to All', emoji: '🎉' },
  { value: 'student', label: 'Student', emoji: '🎓' },
  { value: 'alumni', label: 'Alumni', emoji: '🏛️' },
  { value: 'greek', label: 'Greek Life', emoji: '🏛️' },
  { value: 'family', label: 'Family', emoji: '👨‍👩‍👧‍👦' },
  { value: 'sponsor', label: 'Sponsored', emoji: '⭐' },
  { value: 'private', label: 'Private', emoji: '🔒' },
];

export const AMENITIES = {
  grill: { label: 'Grill', emoji: '🍖' },
  tent: { label: 'Tent', emoji: '⛺' },
  games: { label: 'Games', emoji: '🎮' },
  tv: { label: 'TV', emoji: '📺' },
  music: { label: 'Music', emoji: '🎵' },
  drinks: { label: 'Drinks', emoji: '🍺' },
  food: { label: 'Food', emoji: '🍔' },
  cornhole: { label: 'Cornhole', emoji: '🎯' },
};
export const amenityInfo = (a) => AMENITIES[a?.toLowerCase?.()] || { label: a, emoji: '✨' };

// Distance between two {lat,lng} points as "450 ft" / "0.3 mi"
export function distanceLabel(from, to) {
  if (!from?.lat || !to?.lat) return null;
  const R = 3958.8;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(to.lat - from.lat);
  const dLng = rad(to.lng - from.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.sin(dLng / 2) ** 2;
  const mi = 2 * R * Math.asin(Math.sqrt(a));
  if (mi < 0.1) return `${Math.round(mi * 5280)} ft`;
  return mi < 10 ? `${mi.toFixed(1)} mi` : `${Math.round(mi)} mi`;
}

// "Today", "Tomorrow", "Sat, Nov 28"
export function tailgateDayLabel(t) {
  if (!t?.game_date) return 'Date TBD';
  const d = parseISO(t.game_date);
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'EEE, MMM d');
}

export function timeRange(t) {
  if (!t?.start_time && !t?.end_time) return 'Time TBD';
  const fmt = (v) => {
    if (!v) return '';
    if (/[ap]m/i.test(v)) return v;
    const [h, m] = v.split(':').map(Number);
    if (Number.isNaN(h)) return v;
    const ap = h >= 12 ? 'PM' : 'AM';
    return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, '0')} ${ap}`;
  };
  return [fmt(t.start_time), fmt(t.end_time)].filter(Boolean).join(' – ');
}

export const isPastTailgate = (t) => {
  if (!t?.game_date) return false;
  const d = parseISO(t.game_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
};
