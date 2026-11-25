import { client } from '@/api/client';

/**
 * Followed teams. Signed-in fans keep them on their profile (favorite_teams);
 * signed-out fans keep them on this device so Follow always works. Device
 * teams are merged into the profile the next time the fan signs in.
 */
const GUEST_KEY = 'gameday_guest_teams';
export const FAVORITES_EVENT = 'gameday:favorites';

export function getGuestTeams() {
  try {
    const v = JSON.parse(localStorage.getItem(GUEST_KEY) || '[]');
    return Array.isArray(v) ? v.filter(t => typeof t === 'string') : [];
  } catch {
    return [];
  }
}

function setGuestTeams(teams) {
  try {
    if (teams.length) localStorage.setItem(GUEST_KEY, JSON.stringify(teams));
    else localStorage.removeItem(GUEST_KEY);
  } catch { /* storage blocked: nothing to persist */ }
}

/** The fan's followed team names (profile when signed in, else this device) */
export function favoriteTeamsOf(user) {
  return user ? (user.favorite_teams || []) : getGuestTeams();
}

/** Save the full list; returns the saved list */
export async function saveFavoriteTeams(user, teams) {
  const next = [...new Set(teams.map(t => t.trim()).filter(Boolean))];
  if (user) await client.auth.updateMe({ favorite_teams: next });
  else setGuestTeams(next);
  window.dispatchEvent(new CustomEvent(FAVORITES_EVENT, { detail: next }));
  return next;
}

/**
 * After sign-in: fold any device-only teams into the profile, once.
 * Returns the updated user (or the same user when there was nothing to merge).
 */
export async function mergeGuestTeams(user) {
  const guest = getGuestTeams();
  if (!user || !guest.length) return user;
  const current = user.favorite_teams || [];
  const merged = [...current, ...guest.filter(g => !current.includes(g))];
  try {
    if (merged.length !== current.length) await client.auth.updateMe({ favorite_teams: merged });
    setGuestTeams([]);
    return { ...user, favorite_teams: merged };
  } catch {
    return user;
  }
}
