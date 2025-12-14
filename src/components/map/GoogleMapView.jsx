import React, { useCallback, useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Circle, InfoWindow } from '@react-google-maps/api';
import { cn } from '@/lib/utils';
import { config } from '@/lib/config';

const GOOGLE_MAPS_API_KEY = config.googleMaps.apiKey;

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 33.2084,
  lng: -87.5503,
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
  ],
};

// Custom marker icons using SVG data URIs
export const markerIcons = {
  user: {
    url: 'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="18" fill="#FF6B35" stroke="white" stroke-width="3"/>
        <text x="20" y="26" text-anchor="middle" font-size="16">📍</text>
      </svg>
    `),
    scaledSize: { width: 40, height: 40 },
    anchor: { x: 20, y: 20 },
  },
  car: {
    url: 'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="18" fill="#3B82F6" stroke="white" stroke-width="3"/>
        <text x="20" y="26" text-anchor="middle" font-size="16">🚗</text>
      </svg>
    `),
    scaledSize: { width: 40, height: 40 },
    anchor: { x: 20, y: 20 },
  },
  friend: (color = '#10B981') => ({
    url: 'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="18" fill="${color}" stroke="white" stroke-width="3"/>
        <text x="20" y="26" text-anchor="middle" font-size="16">👤</text>
      </svg>
    `),
    scaledSize: { width: 40, height: 40 },
    anchor: { x: 20, y: 20 },
  }),
  tailgate: {
    url: 'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="18" fill="#10B981" stroke="white" stroke-width="3"/>
        <text x="20" y="26" text-anchor="middle" font-size="16">🎉</text>
      </svg>
    `),
    scaledSize: { width: 40, height: 40 },
    anchor: { x: 20, y: 20 },
  },
  restroom: {
    url: 'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="16" fill="#6366F1" stroke="white" stroke-width="2"/>
        <text x="18" y="24" text-anchor="middle" font-size="14">🚻</text>
      </svg>
    `),
    scaledSize: { width: 36, height: 36 },
    anchor: { x: 18, y: 18 },
  },
  food: {
    url: 'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="16" fill="#F59E0B" stroke="white" stroke-width="2"/>
        <text x="18" y="24" text-anchor="middle" font-size="14">🍔</text>
      </svg>
    `),
    scaledSize: { width: 36, height: 36 },
    anchor: { x: 18, y: 18 },
  },
  firstAid: {
    url: 'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="16" fill="#EF4444" stroke="white" stroke-width="2"/>
        <text x="18" y="24" text-anchor="middle" font-size="14">🏥</text>
      </svg>
    `),
    scaledSize: { width: 36, height: 36 },
    anchor: { x: 18, y: 18 },
  },
};

export default function GoogleMapView({
  center,
  zoom = 15,
  markers = [],
  userLocation = null,
  onMarkerClick,
  onMapClick,
  className,
  children,
}) {
  const [map, setMap] = useState(null);
  const [selectedMarker, setSelectedMarker] = useState(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
    id: 'google-map-script',
  });

  const onLoad = useCallback((map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleMarkerClick = (marker) => {
    setSelectedMarker(marker);
    onMarkerClick?.(marker);
  };

  const mapCenter = center 
    ? { lat: center[0], lng: center[1] }
    : userLocation 
      ? { lat: userLocation.lat, lng: userLocation.lng }
      : defaultCenter;

  if (loadError) {
    return (
      <div className={cn("w-full h-full rounded-2xl overflow-hidden bg-slate-200 flex items-center justify-center", className)}>
        <div className="text-center p-4">
          <p className="text-slate-600 font-medium">Map failed to load</p>
          <p className="text-slate-500 text-sm mt-1">Check your Google Maps API key</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={cn("w-full h-full rounded-2xl overflow-hidden bg-slate-200 flex items-center justify-center", className)}>
        <div className="animate-pulse text-slate-500">Loading map...</div>
      </div>
    );
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className={cn("w-full h-full rounded-2xl overflow-hidden bg-slate-200 flex items-center justify-center", className)}>
        <div className="text-center p-4">
          <p className="text-slate-600 font-medium">Google Maps API key required</p>
          <p className="text-slate-500 text-sm mt-1">Set VITE_GOOGLE_MAPS_API_KEY in your .env file</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full h-full rounded-2xl overflow-hidden", className)}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={onMapClick}
        options={mapOptions}
      >
        {/* User location marker */}
        {userLocation && (
          <>
            <Circle
              center={{ lat: userLocation.lat, lng: userLocation.lng }}
              radius={userLocation.accuracy || 20}
              options={{
                fillColor: '#FF6B35',
                fillOpacity: 0.2,
                strokeColor: '#FF6B35',
                strokeOpacity: 0.8,
                strokeWeight: 2,
              }}
            />
            <Marker
              position={{ lat: userLocation.lat, lng: userLocation.lng }}
              icon={markerIcons.user}
              title="You are here"
            />
          </>
        )}

        {/* Custom markers */}
        {markers.map((marker, idx) => (
          <Marker
            key={marker.id || idx}
            position={{ lat: marker.lat, lng: marker.lng }}
            icon={marker.icon || markerIcons.tailgate}
            title={marker.title || marker.popup}
            onClick={() => handleMarkerClick(marker)}
          />
        ))}

        {/* Info window for selected marker */}
        {selectedMarker && selectedMarker.popup && (
          <InfoWindow
            position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div className="p-1">
              <p className="font-medium text-slate-900">{selectedMarker.popup}</p>
              {selectedMarker.description && (
                <p className="text-sm text-slate-600 mt-1">{selectedMarker.description}</p>
              )}
            </div>
          </InfoWindow>
        )}

        {children}
      </GoogleMap>
    </div>
  );
}
