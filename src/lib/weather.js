// Real current weather from Open-Meteo (free, no API key): https://open-meteo.com
// Only used when the user has already granted location (or taps to allow it).

const CODES = {
  0: ['Clear skies', '☀️'], 1: ['Mostly clear', '🌤️'], 2: ['Partly cloudy', '⛅'], 3: ['Overcast', '☁️'],
  45: ['Fog', '🌫️'], 48: ['Freezing fog', '🌫️'],
  51: ['Light drizzle', '🌦️'], 53: ['Drizzle', '🌦️'], 55: ['Heavy drizzle', '🌧️'],
  56: ['Freezing drizzle', '🌧️'], 57: ['Freezing drizzle', '🌧️'],
  61: ['Light rain', '🌦️'], 63: ['Rain', '🌧️'], 65: ['Heavy rain', '🌧️'],
  66: ['Freezing rain', '🌧️'], 67: ['Freezing rain', '🌧️'],
  71: ['Light snow', '🌨️'], 73: ['Snow', '🌨️'], 75: ['Heavy snow', '❄️'], 77: ['Snow grains', '🌨️'],
  80: ['Rain showers', '🌦️'], 81: ['Rain showers', '🌧️'], 82: ['Heavy showers', '⛈️'],
  85: ['Snow showers', '🌨️'], 86: ['Snow showers', '❄️'],
  95: ['Thunderstorms', '⛈️'], 96: ['Storms + hail', '⛈️'], 99: ['Storms + hail', '⛈️'],
};

export async function fetchWeather({ lat, lng }) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lng.toFixed(3)}`
    + '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation_probability'
    + '&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather unavailable');
  const c = (await res.json()).current || {};
  const [label, emoji] = CODES[c.weather_code] || ['Weather', '🌡️'];
  return {
    temp: Math.round(c.temperature_2m),
    feels: Math.round(c.apparent_temperature),
    wind: Math.round(c.wind_speed_10m),
    rain: c.precipitation_probability ?? null,
    label,
    emoji,
  };
}

// Has the user already allowed location? (no prompt)
export async function locationAlreadyAllowed() {
  try {
    const status = await navigator.permissions?.query({ name: 'geolocation' });
    return status?.state === 'granted';
  } catch {
    return false;
  }
}

export function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Location not supported'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      reject,
      { maximumAge: 10 * 60 * 1000, timeout: 10000 }
    );
  });
}
