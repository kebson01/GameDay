// Centralized Configuration
// All environment variables and app settings

export const config = {
  // App Info
  appName: import.meta.env.VITE_APP_NAME || 'GameDay',
  
  // API Endpoints
  espn: {
    baseUrl: import.meta.env.VITE_ESPN_BASE_URL || 'https://site.api.espn.com/apis/site/v2/sports/football/college-football',
    coreUrl: import.meta.env.VITE_ESPN_CORE_URL || 'https://sports.core.api.espn.com/v2/sports/football/leagues/college-football',
  },
  
  // Google Maps
  googleMaps: {
    apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  },
  
  // OpenAI
  openai: {
    apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  },
  
  // App Settings
  settings: {
    refreshInterval: Number(import.meta.env.VITE_REFRESH_INTERVAL) || 60000,
    defaultSport: import.meta.env.VITE_DEFAULT_SPORT || 'college-football',
  },
  
  // Feature Flags
  features: {
    aiAssistant: !!import.meta.env.VITE_OPENAI_API_KEY,
    maps: !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  },
};

// Helper to check if a feature is enabled
export const isFeatureEnabled = (feature) => {
  return config.features[feature] || false;
};

// Helper to get API key status (for debugging)
export const getApiStatus = () => ({
  googleMaps: config.googleMaps.apiKey ? 'configured' : 'missing',
  openai: config.openai.apiKey ? 'configured' : 'missing',
  espn: 'public (no key required)',
});

export default config;



