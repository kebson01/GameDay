// Cloud accounts (Supabase Auth + public.profiles). Used by src/lib/auth.js
// when Supabase is configured. The signed-in user is cached in localStorage
// ("gameday_auth") in the same shape as local accounts, so the rest of the
// app keeps reading it synchronously via auth.me().

import { supabase } from './supabase';
import { getItem, setItem, removeItem } from './localStorage';
import { pullAll } from './cloudSync';
import { getThemePreference, setThemePreference } from './theme';

const AUTH_STORAGE_KEY = 'gameday_auth';
const PENDING_FAVORITES_KEY = 'gameday_pending_favorites';

function friendlyError(error) {
  const msg = error?.message || String(error);
  if (/invalid login credentials/i.test(msg)) return new Error('Incorrect email or password');
  if (/email not confirmed/i.test(msg)) return new Error('Please confirm your email first. Check your inbox for the link.');
  if (/user already registered/i.test(msg)) return new Error('An account with this email already exists. Sign in instead.');
  if (/provider is not enabled|unsupported provider/i.test(msg)) {
    return new Error("Google sign-in isn't switched on for GameDay yet. Use email for now.");
  }
  if (/rate limit/i.test(msg)) return new Error('Too many attempts. Please wait a minute and try again.');
  if (/not authorized|error sending (confirmation|magic link)|sending email/i.test(msg)) {
    return new Error("We couldn't send the confirmation email right now. Try \"Continue with Google\", or try again later.");
  }
  if (/failed to fetch|network/i.test(msg)) return new Error("Can't reach GameDay's servers. Check your connection.");
  return new Error(msg);
}

function toAppUser(authUser, profile) {
  const meta = authUser.user_metadata || {};
  const providers = authUser.app_metadata?.providers || [authUser.app_metadata?.provider].filter(Boolean);
  return {
    id: authUser.id,
    email: authUser.email,
    full_name: profile?.full_name || meta.full_name || meta.name || authUser.email?.split('@')[0],
    picture: profile?.avatar_url || meta.avatar_url || meta.picture || null,
    favorite_teams: profile?.favorite_teams || [],
    settings: profile?.settings || {},
    auth_provider: providers.join('+') || 'email',
    created_date: authUser.created_at,
    cloud: true,
  };
}

async function loadProfile(authUser) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
  if (error) throw error;
  if (data) return data;
  // Profile row is normally made by a database trigger; create it if missing
  const meta = authUser.user_metadata || {};
  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .insert({ id: authUser.id, full_name: meta.full_name || meta.name || null, avatar_url: meta.avatar_url || meta.picture || null })
    .select()
    .single();
  if (insertError) throw insertError;
  return created;
}

// Read the session, refresh the cached user from the cloud profile, apply
// synced settings, and pull personal data. Returns the user or null.
export async function refreshCloudUser({ pull = true } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    if (getItem(AUTH_STORAGE_KEY, null)?.cloud) removeItem(AUTH_STORAGE_KEY);
    return null;
  }
  let profile = await loadProfile(session.user);

  // First cloud sign-in on a device that had on-device favorites: keep them
  const pending = getItem(PENDING_FAVORITES_KEY, null);
  if (pending?.length && !(profile.favorite_teams || []).length) {
    const { data } = await supabase.from('profiles').update({ favorite_teams: pending }).eq('id', session.user.id).select().single();
    if (data) profile = data;
  }
  removeItem(PENDING_FAVORITES_KEY);

  const user = toAppUser(session.user, profile);
  setItem(AUTH_STORAGE_KEY, user);

  // Theme follows the account across devices
  const theme = profile.settings?.theme;
  if (theme && theme !== getThemePreference()) setThemePreference(theme, { fromCloud: true });

  if (pull) await pullAll().catch(err => console.warn('[GameDay sync]', err));
  return user;
}

export async function cloudRegister({ email, password, full_name }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name },
      emailRedirectTo: window.location.origin + import.meta.env.BASE_URL,
    },
  });
  if (error) throw friendlyError(error);
  // Supabase returns a user with no identities when the email is already registered
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new Error('An account with this email already exists. Sign in instead.');
  }
  if (!data.session) {
    const err = new Error(`Almost done! We sent a confirmation link to ${email}. Open it, then sign in here.`);
    err.code = 'CONFIRM_EMAIL';
    throw err;
  }
  return refreshCloudUser();
}

export async function cloudLogin({ email, password }) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw friendlyError(error);
  return refreshCloudUser();
}

// Google: the ID token from the "Continue with Google" button signs in to Supabase
export async function cloudGoogle(credential) {
  const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: credential });
  if (error) throw friendlyError(error);
  return refreshCloudUser();
}

export async function cloudUpdate(updates) {
  const current = getItem(AUTH_STORAGE_KEY, null);
  if (!current?.cloud) throw new Error('Not authenticated');
  const next = { ...current, ...updates };
  setItem(AUTH_STORAGE_KEY, next); // instant locally

  const row = {};
  if ('full_name' in updates) row.full_name = updates.full_name;
  if ('favorite_teams' in updates) row.favorite_teams = updates.favorite_teams || [];
  if ('picture' in updates) row.avatar_url = updates.picture;
  if ('settings' in updates) row.settings = { ...(current.settings || {}), ...(updates.settings || {}) };
  if (Object.keys(row).length) {
    const { error } = await supabase.from('profiles').update(row).eq('id', current.id);
    if (error) throw friendlyError(error);
  }
  return next;
}

export async function cloudLogout() {
  try {
    await supabase.auth.signOut();
  } finally {
    removeItem(AUTH_STORAGE_KEY);
  }
}

// Called once at startup (see main.jsx)
export async function initCloudAuth() {
  // An on-device (non-cloud) session from before Supabase was enabled:
  // sign it out but remember its teams for the first cloud sign-in.
  const cached = getItem(AUTH_STORAGE_KEY, null);
  if (cached && !cached.cloud) {
    if (cached.favorite_teams?.length) setItem(PENDING_FAVORITES_KEY, cached.favorite_teams);
    removeItem(AUTH_STORAGE_KEY);
  }

  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') removeItem(AUTH_STORAGE_KEY);
  });

  // Push theme changes made on this device to the account
  window.addEventListener('gameday:theme', (e) => {
    if (e.detail?.fromCloud) return;
    const user = getItem(AUTH_STORAGE_KEY, null);
    if (user?.cloud) {
      const pref = typeof e.detail === 'string' ? e.detail : e.detail?.preference;
      cloudUpdate({ settings: { theme: pref } }).catch(() => {});
    }
  });

  return refreshCloudUser();
}
