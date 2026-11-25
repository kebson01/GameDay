import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from '@/App.jsx'
import '@/index.css'
import { initTheme } from '@/lib/theme'
import { initAccent } from '@/lib/accent'
import { isCloudEnabled } from '@/lib/supabase'
import { initCloudAuth } from '@/lib/cloudAuth'
import { startCloudSync } from '@/lib/cloudSync'

initTheme()
initAccent()

// Initialize sample data
import '@/lib/dataService'

// Configure React Query with offline-aware settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      retry: (failureCount, error) => {
        if (!navigator.onLine) return false;
        return failureCount < 3;
      },
      refetchOnWindowFocus: navigator.onLine,
    },
  },
});

// Register service worker for PWA (only in production)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .then((registration) => {
        console.log('[GameDay] Service Worker registered:', registration.scope);
      })
      .catch((error) => {
        console.warn('[GameDay] Service Worker registration failed:', error);
      });
  });
}

// After a cloud sync, refetch data shown on screen
window.addEventListener('gameday:synced', () => queryClient.invalidateQueries())

function render() {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>,
  )
}

// With cloud accounts, load the signed-in profile and synced data before the
// first render (capped at 2.5s so a slow network never blocks the app).
if (isCloudEnabled()) {
  startCloudSync()
  const timeout = new Promise((resolve) => setTimeout(resolve, 2500))
  Promise.race([initCloudAuth().catch((err) => console.warn('[GameDay auth]', err)), timeout]).finally(render)
} else {
  render()
}
