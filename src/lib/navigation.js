// Navigation utilities for opening maps apps on device
import { Capacitor } from '@capacitor/core';

/**
 * Open navigation to a destination using the device's native maps app
 * @param {number} destLat - Destination latitude
 * @param {number} destLng - Destination longitude
 * @param {string} destName - Optional destination name/label
 * @param {Object} startLocation - Optional start location {lat, lng}
 */
export async function openNavigation(destLat, destLng, destName = '', startLocation = null) {
  const platform = Capacitor.getPlatform();
  
  // Build the destination label for the URL
  const destination = destName 
    ? encodeURIComponent(destName)
    : `${destLat},${destLng}`;
  
  let url;
  
  if (platform === 'ios') {
    // Apple Maps URL scheme - works on iOS
    // If start location provided, include it
    if (startLocation) {
      url = `maps://maps.apple.com/?saddr=${startLocation.lat},${startLocation.lng}&daddr=${destLat},${destLng}&dirflg=d`;
    } else {
      url = `maps://maps.apple.com/?daddr=${destLat},${destLng}&dirflg=d`;
    }
    
    // Try Apple Maps first
    try {
      window.location.href = url;
      return;
    } catch (e) {
      // Fall back to Google Maps
      console.log('Apple Maps not available, trying Google Maps');
    }
  }
  
  if (platform === 'android') {
    // Google Maps intent for Android
    // geo: URI with navigation mode
    if (startLocation) {
      url = `google.navigation:q=${destLat},${destLng}&mode=d`;
    } else {
      url = `google.navigation:q=${destLat},${destLng}&mode=d`;
    }
    
    try {
      window.location.href = url;
      return;
    } catch (e) {
      console.log('Google Maps app not available');
    }
  }
  
  // Fallback: Open Google Maps in browser (works on all platforms)
  if (startLocation) {
    url = `https://www.google.com/maps/dir/?api=1&origin=${startLocation.lat},${startLocation.lng}&destination=${destLat},${destLng}&travelmode=driving`;
  } else {
    url = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;
  }
  
  window.open(url, '_blank');
}

/**
 * Open a location in maps (just view, not navigate)
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {string} label - Optional label for the location
 */
export async function openLocation(lat, lng, label = '') {
  const platform = Capacitor.getPlatform();
  
  let url;
  
  if (platform === 'ios') {
    // Apple Maps
    url = label 
      ? `maps://maps.apple.com/?q=${encodeURIComponent(label)}&ll=${lat},${lng}`
      : `maps://maps.apple.com/?ll=${lat},${lng}`;
    
    try {
      window.location.href = url;
      return;
    } catch (e) {
      // Fall back
    }
  }
  
  if (platform === 'android') {
    // Google Maps geo URI
    url = label
      ? `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(label)})`
      : `geo:${lat},${lng}`;
    
    try {
      window.location.href = url;
      return;
    } catch (e) {
      // Fall back
    }
  }
  
  // Fallback: Google Maps web
  url = `https://www.google.com/maps?q=${lat},${lng}`;
  window.open(url, '_blank');
}

/**
 * Get user's current location using Capacitor Geolocation or browser API
 * @returns {Promise<{lat: number, lng: number, accuracy: number}>}
 */
export async function getCurrentLocation() {
  // Try Capacitor Geolocation first
  if (Capacitor.isNativePlatform()) {
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      
      // Check permissions
      const permission = await Geolocation.checkPermissions();
      if (permission.location !== 'granted') {
        await Geolocation.requestPermissions();
      }
      
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });
      
      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
    } catch (e) {
      console.error('Capacitor Geolocation error:', e);
      // Fall through to browser API
    }
  }
  
  // Browser Geolocation API
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
}

/**
 * Watch user's location continuously
 * @param {Function} callback - Called with {lat, lng, accuracy} on each update
 * @param {Function} errorCallback - Called with error on failure
 * @returns {Function} - Call to stop watching
 */
export function watchLocation(callback, errorCallback) {
  if (Capacitor.isNativePlatform()) {
    // Use Capacitor Geolocation
    let watchId = null;
    
    import('@capacitor/geolocation').then(({ Geolocation }) => {
      Geolocation.watchPosition(
        { enableHighAccuracy: true },
        (position, err) => {
          if (err) {
            errorCallback?.(err);
            return;
          }
          if (position) {
            callback({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
            });
          }
        }
      ).then(id => {
        watchId = id;
      });
    });
    
    return () => {
      if (watchId !== null) {
        import('@capacitor/geolocation').then(({ Geolocation }) => {
          Geolocation.clearWatch({ id: watchId });
        });
      }
    };
  }
  
  // Browser Geolocation API
  if (!navigator.geolocation) {
    errorCallback?.(new Error('Geolocation not supported'));
    return () => {};
  }
  
  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      callback({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
    },
    (error) => {
      errorCallback?.(error);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000,
    }
  );
  
  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
}

export default {
  openNavigation,
  openLocation,
  getCurrentLocation,
  watchLocation,
};

