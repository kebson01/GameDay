// Supabase client (accounts + cloud sync). Enabled when both env vars are set;
// otherwise GameDay falls back to on-device accounts.
// The publishable key is meant to be public: row-level security in the
// database limits every user to their own rows.
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isCloudEnabled = () => Boolean(url && key);

export const supabase = isCloudEnabled()
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'gameday_supabase_auth',
      },
    })
  : null;
