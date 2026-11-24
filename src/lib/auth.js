// Authentication for GameDay.
// With Supabase configured (VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY)
// accounts live in the cloud and sync across devices (src/lib/cloudAuth.js).
// Without it, accounts are stored on this device only (the functions below).

import { getItem, setItem, removeItem, STORAGE_KEYS } from './localStorage';
import { googleSignOut } from './googleAuth';
import { isCloudEnabled } from './supabase';
import { cloudRegister, cloudLogin, cloudGoogle, cloudUpdate, cloudLogout } from './cloudAuth';

const AUTH_STORAGE_KEY = 'gameday_auth';
const USERS_STORAGE_KEY = 'gameday_users';

// Get current authenticated user
export function getCurrentUser() {
  return getItem(AUTH_STORAGE_KEY, null);
}

// Check if user is logged in
export function isAuthenticated() {
  return getCurrentUser() !== null;
}

// Get all registered users (for demo purposes)
function getUsers() {
  return getItem(USERS_STORAGE_KEY, []);
}

function saveUsers(users) {
  setItem(USERS_STORAGE_KEY, users);
}

// Register a new user
export function register({ email, password, full_name }) {
  const users = getUsers();
  
  // Check if user already exists
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('An account with this email already exists');
  }
  
  // Create new user
  const newUser = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
    email: email.toLowerCase(),
    password: btoa(password), // Simple encoding (not secure, but works for local demo)
    full_name,
    favorite_teams: [],
    created_date: new Date().toISOString(),
  };
  
  users.push(newUser);
  saveUsers(users);
  
  // Auto login after registration
  const { password: _, ...userWithoutPassword } = newUser;
  setItem(AUTH_STORAGE_KEY, userWithoutPassword);
  
  return userWithoutPassword;
}

// Login user
export function login({ email, password }) {
  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    throw new Error('No account found with this email');
  }
  
  if (!user.password && user.google_sub) {
    throw new Error('This account uses Google sign-in. Tap "Continue with Google".');
  }

  if (user.password !== btoa(password)) {
    throw new Error('Incorrect password');
  }
  
  // Store user session (without password)
  const { password: _, ...userWithoutPassword } = user;
  setItem(AUTH_STORAGE_KEY, userWithoutPassword);
  
  return userWithoutPassword;
}

// Sign in with a Google profile (from src/lib/googleAuth.js).
// Links to an existing account with the same email, or creates one.
export function signInWithGoogle(profile) {
  const users = getUsers();
  const email = profile.email.toLowerCase();
  let idx = users.findIndex(u => u.google_sub === profile.sub);
  if (idx === -1) idx = users.findIndex(u => u.email.toLowerCase() === email);

  if (idx === -1) {
    users.push({
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      email,
      full_name: profile.name,
      favorite_teams: [],
      created_date: new Date().toISOString(),
    });
    idx = users.length - 1;
  }

  users[idx] = {
    ...users[idx],
    google_sub: profile.sub,
    picture: profile.picture || users[idx].picture || null,
    full_name: users[idx].full_name || profile.name,
    auth_provider: users[idx].password ? 'password+google' : 'google',
  };
  saveUsers(users);

  const { password: _, ...userWithoutPassword } = users[idx];
  setItem(AUTH_STORAGE_KEY, userWithoutPassword);
  return userWithoutPassword;
}

// Logout user
export function logout() {
  removeItem(AUTH_STORAGE_KEY);
  return true;
}

// Update current user
export function updateUser(updates) {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    throw new Error('Not authenticated');
  }
  
  // Update in users list
  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === currentUser.id);
  if (userIndex !== -1) {
    users[userIndex] = { ...users[userIndex], ...updates };
    saveUsers(users);
  }
  
  // Update current session
  const updatedUser = { ...currentUser, ...updates };
  setItem(AUTH_STORAGE_KEY, updatedUser);
  
  return updatedUser;
}

// Auth facade used throughout the app (Promise-based for React Query compatibility)
export const auth = {
  // Get current user (returns Promise for compatibility)
  me: () => {
    return new Promise((resolve, reject) => {
      const user = getCurrentUser();
      if (user) {
        resolve(user);
      } else {
        reject(new Error('Not authenticated'));
      }
    });
  },
  
  // Login
  login: ({ email, password }) => {
    if (isCloudEnabled()) return cloudLogin({ email, password });
    return new Promise((resolve, reject) => {
      try {
        const user = login({ email, password });
        resolve(user);
      } catch (error) {
        reject(error);
      }
    });
  },
  
  // Register
  register: ({ email, password, full_name }) => {
    if (isCloudEnabled()) return cloudRegister({ email, password, full_name });
    return new Promise((resolve, reject) => {
      try {
        const user = register({ email, password, full_name });
        resolve(user);
      } catch (error) {
        reject(error);
      }
    });
  },
  
  // Sign in with Google (profile from googleAuth.profileFromCredential)
  signInWithGoogle: (profile, credential) => {
    if (isCloudEnabled()) return cloudGoogle(credential);
    return new Promise((resolve, reject) => {
      try {
        resolve(signInWithGoogle(profile));
      } catch (error) {
        reject(error);
      }
    });
  },

  // Logout
  logout: async (redirectUrl = import.meta.env.BASE_URL) => {
    googleSignOut();
    if (isCloudEnabled()) await cloudLogout();
    else logout();
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  },
  
  // Update user
  updateMe: (updates) => {
    if (isCloudEnabled()) return cloudUpdate(updates);
    return new Promise((resolve, reject) => {
      try {
        const user = updateUser(updates);
        resolve(user);
      } catch (error) {
        reject(error);
      }
    });
  },
  
  // Redirect to login (now shows login modal instead)
  redirectToLogin: (returnUrl) => {
    // Store return URL for after login
    if (returnUrl) {
      sessionStorage.setItem('gameday_return_url', returnUrl);
    }
    // Dispatch event to show login modal
    window.dispatchEvent(new CustomEvent('gameday:showLogin'));
  },
};

export default auth;


