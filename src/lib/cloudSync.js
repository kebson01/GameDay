// Syncs a signed-in user's personal data (saved car spots, parked car,
// predictions) between this device and Supabase, so it follows the account
// to every device. Each collection is stored as one JSON array per user in
// public.user_data (row-level security: users only see their own rows).
//
// Merge rule: union by item id; when both sides have an item, the newer
// updated_date wins. (Deletions on one device are not propagated yet.)

import { supabase, isCloudEnabled } from './supabase';
import { getItem, setItem, withoutChangeEvents } from './localStorage';

const AUTH_STORAGE_KEY = 'gameday_auth';

export const SYNCED_COLLECTIONS = {
  car_locations: {
    key: 'gameday_car_locations',
    owns: (item, user) => item.user_email && item.user_email.toLowerCase() === user.email?.toLowerCase(),
  },
  parked_cars: {
    key: 'gameday_parked_cars',
    owns: (item, user) => item.user_id === user.id,
  },
  predictions: {
    key: 'gameday_predictions',
    owns: (item, user) => item.user_email && item.user_email.toLowerCase() === user.email?.toLowerCase(),
  },
};

const keyToCollection = Object.fromEntries(
  Object.entries(SYNCED_COLLECTIONS).map(([name, c]) => [c.key, name])
);

const cloudUser = () => {
  const u = getItem(AUTH_STORAGE_KEY, null);
  return u?.cloud ? u : null;
};

const newer = (a, b) =>
  (a?.updated_date || a?.created_date || '') >= (b?.updated_date || b?.created_date || '') ? a : b;

function mergeItems(localOwned, remote) {
  const byId = new Map();
  for (const item of remote) if (item?.id) byId.set(item.id, item);
  for (const item of localOwned) {
    if (!item?.id) continue;
    byId.set(item.id, byId.has(item.id) ? newer(item, byId.get(item.id)) : item);
  }
  return [...byId.values()];
}

// Download everything for the signed-in user, merge into this device, then
// upload the merged result (so items made offline reach the cloud).
export async function pullAll() {
  const user = cloudUser();
  if (!isCloudEnabled() || !user) return false;
  const { data, error } = await supabase.from('user_data').select('collection, items').eq('user_id', user.id);
  if (error) throw error;
  const remoteBy = Object.fromEntries((data || []).map(r => [r.collection, Array.isArray(r.items) ? r.items : []]));

  for (const [name, cfg] of Object.entries(SYNCED_COLLECTIONS)) {
    const all = getItem(cfg.key, []);
    const mine = all.filter(i => cfg.owns(i, user));
    const others = all.filter(i => !cfg.owns(i, user));
    const merged = mergeItems(mine, remoteBy[name] || []);
    withoutChangeEvents(() => setItem(cfg.key, [...others, ...merged]));
    const remoteJson = JSON.stringify(remoteBy[name] || []);
    if (JSON.stringify(merged) !== remoteJson) await push(name);
  }
  window.dispatchEvent(new CustomEvent('gameday:synced'));
  return true;
}

export async function push(collection) {
  const user = cloudUser();
  const cfg = SYNCED_COLLECTIONS[collection];
  if (!isCloudEnabled() || !user || !cfg) return;
  const items = getItem(cfg.key, []).filter(i => cfg.owns(i, user));
  const { error } = await supabase
    .from('user_data')
    .upsert({ user_id: user.id, collection, items }, { onConflict: 'user_id,collection' });
  if (error) console.warn('[GameDay sync] upload failed:', error.message);
}

// Upload shortly after local changes (batched)
const timers = {};
function schedulePush(collection) {
  clearTimeout(timers[collection]);
  timers[collection] = setTimeout(() => {
    push(collection).catch(err => console.warn('[GameDay sync]', err));
  }, 800);
}

let started = false;
export function startCloudSync() {
  if (started || !isCloudEnabled()) return;
  started = true;
  window.addEventListener('gameday:local-change', (e) => {
    const collection = keyToCollection[e.detail?.key];
    if (collection && cloudUser()) schedulePush(collection);
  });
  // Catch up when the app comes back to the foreground or back online
  const catchUp = () => {
    if (document.visibilityState === 'visible' && navigator.onLine && cloudUser()) {
      pullAll().catch(err => console.warn('[GameDay sync]', err));
    }
  };
  document.addEventListener('visibilitychange', catchUp);
  window.addEventListener('online', catchUp);
}
