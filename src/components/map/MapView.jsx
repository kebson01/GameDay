// Legacy MapView - now redirects to GoogleMapView
// This file maintains backward compatibility for any components still using the old import

import GoogleMapView, { markerIcons } from './GoogleMapView';

// Re-export GoogleMapView as default
export default GoogleMapView;

// Legacy exports mapped to new markerIcons
export const friendIcon = markerIcons.friend;
export const carIcon = markerIcons.car;
export const tailgateIcon = markerIcons.tailgate;

// Legacy createCustomIcon function - creates a marker icon with emoji and color
export const createCustomIcon = (emoji, color = '#FF6B35') => ({
  url: 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="16" fill="${color}" stroke="white" stroke-width="2"/>
      <text x="18" y="24" text-anchor="middle" font-size="14">${emoji}</text>
    </svg>
  `),
  scaledSize: { width: 36, height: 36 },
  anchor: { x: 18, y: 18 },
  });

// Legacy amenityIcons using the new format
export const amenityIcons = {
  restroom: createCustomIcon('🚻', '#6366F1'),
  food: createCustomIcon('🍔', '#F59E0B'),
  first_aid: createCustomIcon('🏥', '#EF4444'),
  water: createCustomIcon('💧', '#0EA5E9'),
  atm: createCustomIcon('💵', '#22C55E'),
  entrance: createCustomIcon('🚪', '#8B5CF6'),
};

// Re-export markerIcons for new code
export { markerIcons };
