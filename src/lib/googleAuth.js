// "Sign in with Google" using Google Identity Services (GIS).
//
// Setup: create an OAuth "Web application" client in Google Cloud Console and
// build with VITE_GOOGLE_CLIENT_ID=<client id>. The button only appears when it
// is set. Add every site the app runs on (e.g. https://kebson.com, your Vercel
// URL, http://localhost:5173) under "Authorized JavaScript origins".
//
// GameDay has no backend yet, so the Google ID token is checked here in the
// browser (audience, issuer, expiry) and used to create/sign in a local
// account. When a server is added, it must verify the token's signature itself.

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
export const isGoogleSignInEnabled = () => Boolean(GOOGLE_CLIENT_ID);

let gsiPromise = null;
function loadGsi() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  if (!gsiPromise) {
    gsiPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.google);
      script.onerror = () => {
        gsiPromise = null;
        reject(new Error('Could not load Google sign-in. Check your connection.'));
      };
      document.head.appendChild(script);
    });
  }
  return gsiPromise;
}

// Decode a JWT payload (base64url, UTF-8 safe)
export function decodeJwt(token) {
  const part = token.split('.')[1];
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

// Turn a GIS credential into a Google profile, with basic sanity checks
export function profileFromCredential(credential) {
  const p = decodeJwt(credential);
  const issuerOk = p.iss === 'accounts.google.com' || p.iss === 'https://accounts.google.com';
  if (!issuerOk || p.aud !== GOOGLE_CLIENT_ID) throw new Error('Google sign-in response was not for this app.');
  if (!p.exp || p.exp * 1000 < Date.now()) throw new Error('Google sign-in expired. Please try again.');
  if (!p.email) throw new Error('Your Google account did not share an email address.');
  return {
    sub: p.sub,
    email: p.email,
    email_verified: Boolean(p.email_verified),
    name: p.name || p.given_name || p.email.split('@')[0],
    picture: p.picture || null,
  };
}

/**
 * Render Google's official button into `element`.
 * onProfile(profile, credential) is called after the user picks an account
 * (credential = Google ID token, used to sign in to Supabase).
 */
export async function renderGoogleButton(element, { onProfile, onError, theme = 'outline', text = 'continue_with' }) {
  if (!isGoogleSignInEnabled() || !element) return;
  const google = await loadGsi();
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (response) => {
      try {
        onProfile(profileFromCredential(response.credential), response.credential);
      } catch (err) {
        onError?.(err);
      }
    },
    ux_mode: 'popup',
    auto_select: false,
    cancel_on_tap_outside: true,
    itp_support: true,
  });
  element.innerHTML = '';
  google.accounts.id.renderButton(element, {
    type: 'standard',
    theme, // 'outline' (light) | 'filled_black' (dark)
    size: 'large',
    shape: 'pill',
    text,
    logo_alignment: 'left',
    width: Math.min(element.clientWidth || 320, 400),
  });
}

// Stop Google from auto-selecting the account after sign-out
export function googleSignOut() {
  try {
    window.google?.accounts?.id?.disableAutoSelect();
  } catch {
    // GIS not loaded: nothing to do
  }
}
