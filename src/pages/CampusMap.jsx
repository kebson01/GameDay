import React, { useState, useEffect, useMemo } from 'react';
import { TailgateIcon } from '@/components/icons/GameDayIcons';
import { client } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import {
  Search, Navigation, Droplets, Utensils, Cross, Banknote, DoorOpen, Bath, X, Map as MapIcon, Car, PartyPopper, MapPin,
} from 'lucide-react';
import AppHeader from '@/components/layout/AppHeader';
import GoogleMapView, { markerIcons } from '@/components/map/GoogleMapView';
import SafetyButton from '@/components/common/SafetyButton';
import { distanceMiles, distanceParts, walkMinutes } from '@/components/crew-v2/geo';
import { openNavigation, getCurrentLocation as getDeviceLocation } from '@/lib/navigation';

const AMENITY_TYPES = [
  { value: 'restroom', label: 'Restrooms', icon: Bath, color: '#6366F1', emoji: '🚻' },
  { value: 'food', label: 'Food & Drinks', icon: Utensils, color: '#F59E0B', emoji: '🍔' },
  { value: 'first_aid', label: 'First Aid', icon: Cross, color: '#EF4444', emoji: '🏥' },
  { value: 'water', label: 'Water Stations', icon: Droplets, color: '#0EA5E9', emoji: '💧' },
  { value: 'atm', label: 'ATMs', icon: Banknote, color: '#22C55E', emoji: '💵' },
  { value: 'entrance', label: 'Stadium Entrances', icon: DoorOpen, color: '#8B5CF6', emoji: '🚪' },
];
const amenityType = (type) => AMENITY_TYPES.find(a => a.value === type);

// Create amenity icons dynamically
const createAmenityIcon = (type) => {
  const amenity = amenityType(type);
  if (!amenity) return markerIcons.tailgate;
  return {
    url: 'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="16" fill="${amenity.color}" stroke="white" stroke-width="2"/>
        <text x="18" y="24" text-anchor="middle" font-size="14">${amenity.emoji}</text>
      </svg>
    `),
    scaledSize: { width: 36, height: 36 },
    anchor: { x: 18, y: 18 },
  };
};

const LEGEND = [
  { label: 'You', color: '#FF6B35' },
  { label: 'Car', color: '#3B82F6' },
  { label: 'Tailgates', color: '#10B981' },
];

export default function CampusMap() {
  const [userLocation, setUserLocation] = useState(null);
  const [selectedFilters, setSelectedFilters] = useState(['restroom', 'food', 'first_aid']);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAmenity, setSelectedAmenity] = useState(null);

  useEffect(() => {
    getDeviceLocation()
      .then(loc => setUserLocation({ lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy }))
      .catch(() => {});
  }, []);

  // Fetch school data with amenities
  const { data: schools = [] } = useQuery({
    queryKey: ['schools'],
    queryFn: () => client.entities.School.list(),
  });

  // Fetch tailgates for map
  const { data: tailgates = [] } = useQuery({
    queryKey: ['map-tailgates'],
    queryFn: () => client.entities.Tailgate.filter({ is_public: true }),
  });

  // The user's parked car: the spot saved in Find My Car (CarLocation), falling back to the legacy ParkedCar entity
  const [parkedCar, setParkedCar] = useState(null);
  useEffect(() => {
    client.auth.me().then(async (user) => {
      const saved = await client.entities.CarLocation.filter({ user_email: user.email }, '-created_date', 1).catch(() => []);
      if (saved[0]?.latitude != null) {
        setParkedCar({ ...saved[0], lat: saved[0].latitude, lng: saved[0].longitude });
        return;
      }
      const cars = await client.entities.ParkedCar.filter({ user_id: user.id }, '-created_date', 1);
      if (cars.length > 0) setParkedCar(cars[0]);
    }).catch(() => {});
  }, []);

  const school = schools[0];
  const amenities = useMemo(() => school?.amenities || [], [school]);
  const q = searchQuery.trim().toLowerCase();
  const matches = (...vals) => !q || vals.some(v => v?.toLowerCase?.().includes(q));

  // Generate markers
  const markers = [];
  const visibleAmenities = [];

  amenities.forEach((amenity, idx) => {
    const info = amenityType(amenity.type);
    // While searching, look across every category, not only the selected chips
    if ((q || selectedFilters.includes(amenity.type)) && matches(amenity.name, amenity.type, info?.label)) {
      const marker = {
        id: `amenity-${idx}`,
        lat: amenity.lat,
        lng: amenity.lng,
        icon: createAmenityIcon(amenity.type),
        popup: amenity.name || amenity.type,
        type: 'amenity',
        data: amenity,
      };
      markers.push(marker);
      visibleAmenities.push(marker);
    }
  });

  tailgates.forEach(t => {
    if (t.location?.lat && t.location?.lng && matches(t.name, t.location?.lot_name, 'tailgate')) {
      markers.push({
        id: `tailgate-${t.id}`,
        lat: t.location.lat,
        lng: t.location.lng,
        icon: markerIcons.tailgate,
        popup: t.name,
        type: 'tailgate',
        data: { ...t, lat: t.location.lat, lng: t.location.lng },
      });
    }
  });

  if (parkedCar && matches('car', 'my car', parkedCar.lot_name)) {
    markers.push({
      id: 'my-car',
      lat: parkedCar.lat,
      lng: parkedCar.lng,
      icon: markerIcons.car,
      popup: 'Your Car',
      type: 'car',
      data: { ...parkedCar, name: parkedCar.lot_name ? `Your car · ${parkedCar.lot_name}` : 'Your Car' },
    });
  }

  const nearby = visibleAmenities
    .map(m => ({ ...m, mi: distanceMiles(userLocation, m) }))
    .sort((a, b) => (a.mi ?? Infinity) - (b.mi ?? Infinity));

  const allSelected = selectedFilters.length === AMENITY_TYPES.length;
  const toggleFilter = (value) => {
    setSelectedFilters(prev => (prev.includes(value) ? prev.filter(f => f !== value) : [...prev, value]));
  };
  const countOf = (type) => amenities.filter(a => a.type === type).length;

  const navigateToAmenity = async (amenity) => {
    if (!amenity.lat || !amenity.lng) return;
    try {
      await openNavigation(amenity.lat, amenity.lng, amenity.name || amenity.type, userLocation);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const sel = selectedAmenity;
  const selInfo = sel?.type === 'amenity' ? amenityType(sel.data?.type) : null;
  const selMi = sel ? distanceMiles(userLocation, sel) : null;
  const selDist = distanceParts(selMi);
  const selWalk = walkMinutes(selMi);
  const carDist = parkedCar ? distanceParts(distanceMiles(userLocation, parkedCar)) : null;

  return (
    <div className="gd-page">
      <AppHeader eyebrow="Stadium Guide" title="Campus Map" subtitle={school?.name ? `${school.name} game day` : 'Find amenities & navigate'} back="Home">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search gates, restrooms, food, tailgates"
            className="gd-input pl-12 pr-10"
            aria-label="Search the map"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-on-surface-variant"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </AppHeader>

      <main className="space-y-4 px-4 pt-4">
        {/* Filter chips */}
        <div className="gd-chip-row" role="toolbar" aria-label="Amenity filters">
          <button
            type="button"
            className="gd-chip normal-case"
            aria-pressed={allSelected}
            onClick={() => setSelectedFilters(allSelected ? [] : AMENITY_TYPES.map(a => a.value))}
          >
            <MapIcon className="h-3.5 w-3.5" />All pins ({amenities.length})
          </button>
          {AMENITY_TYPES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              className="gd-chip normal-case"
              aria-pressed={!allSelected && selectedFilters.includes(value)}
              onClick={() => (allSelected ? setSelectedFilters([value]) : toggleFilter(value))}
            >
              <Icon className="h-3.5 w-3.5" />{label} ({countOf(value)})
            </button>
          ))}
        </div>

        {/* Map */}
        <div className="gd-card relative h-[52vh] min-h-[320px] overflow-hidden">
          <GoogleMapView
            center={userLocation ? [userLocation.lat, userLocation.lng] : school?.stadium_location ? [school.stadium_location.lat, school.stadium_location.lng] : [33.2084, -87.5503]}
            zoom={15}
            userLocation={userLocation}
            markers={markers}
            onMarkerClick={(marker) => setSelectedAmenity(marker)}
            className="rounded-none"
          />

          {/* Legend */}
          <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-2.5 rounded-full bg-surface/90 px-3 py-1.5 text-xs font-semibold text-on-surface shadow backdrop-blur">
            {LEGEND.map(l => (
              <span key={l.label} className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.color }} />{l.label}
              </span>
            ))}
          </div>

          {/* Selected place */}
          {sel && (
            <div className="absolute inset-x-3 bottom-3 z-20 rounded-2xl border border-outline-variant bg-surface-container/95 p-4 shadow-xl backdrop-blur dark:border-white/[0.08]">
              <div className="flex items-start gap-3">
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
                  style={{ backgroundColor: `${selInfo?.color || (sel.type === 'car' ? '#3B82F6' : '#10B981')}26` }}
                  aria-hidden="true"
                >
                  {sel.type === 'tailgate' ? '🎉' : sel.type === 'car' ? '🚗' : selInfo?.emoji || '📍'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-xl font-bold uppercase leading-tight text-on-surface">
                    {sel.data?.name || sel.popup}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {sel.type === 'amenity' ? selInfo?.label || sel.data?.type?.replace('_', ' ') : sel.type === 'car' ? 'Your parked car' : 'Tailgate'}
                    {selDist && ` · ${selDist.value} ${selDist.unit}${selWalk ? ` · ~${selWalk} min walk` : ''}`}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setSelectedAmenity(null)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant dark:bg-surface-container-highest"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => navigateToAmenity(sel.data?.lat ? sel.data : { lat: sel.lat, lng: sel.lng, name: sel.popup })}
                className="gd-btn-primary mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl font-display text-lg font-bold uppercase"
              >
                <Navigation className="h-5 w-5" />Navigate here
              </button>
            </div>
          )}
        </div>

        {/* Nearby list */}
        <section className="space-y-2">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-lg font-bold uppercase text-on-surface">{q ? 'Results' : 'Nearby'}</h2>
            {userLocation && nearby.length > 1 && (
              <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Closest first</span>
            )}
          </div>
          {parkedCar && !q && (
            <button
              type="button"
              onClick={() => setSelectedAmenity(markers.find(m => m.id === 'my-car'))}
              className="gd-card flex w-full items-center gap-3 p-3 text-left"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-300">
                <Car className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-on-surface">Your car{parkedCar.lot_name ? ` · ${parkedCar.lot_name}` : ''}</span>
                <span className="block text-xs text-on-surface-variant">
                  {carDist ? `${carDist.value} ${carDist.unit} away` : 'Saved in Find My Car'}
                </span>
              </span>
              <MapPin className="h-5 w-5 shrink-0 text-on-surface-variant" />
            </button>
          )}
          {nearby.length === 0 ? (
            <div className="gd-card px-6 py-8 text-center">
              <p className="font-display text-lg font-bold uppercase text-on-surface">
                {q ? 'No places match' : amenities.length ? 'No filters selected' : 'No amenities mapped yet'}
              </p>
              <p className="mt-1 text-sm text-on-surface-variant">
                {q ? 'Try another search term.' : amenities.length ? 'Pick a category above to show pins.' : 'Amenities appear here once they are added for your school.'}
              </p>
            </div>
          ) : (
            nearby.map(m => {
              const info = amenityType(m.data.type);
              const d = distanceParts(m.mi);
              return (
                <div key={m.id} className="gd-card flex items-center gap-3 p-3">
                  <button type="button" onClick={() => setSelectedAmenity(m)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                      style={{ backgroundColor: `${info?.color || '#64748B'}26` }}
                      aria-hidden="true"
                    >
                      {info?.emoji || '📍'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-on-surface">{m.data.name || info?.label}</span>
                      <span className="block text-xs text-on-surface-variant">
                        {info?.label}{d ? ` · ${d.value} ${d.unit}` : ''}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Navigate to ${m.data.name || info?.label}`}
                    onClick={() => navigateToAmenity(m.data)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-orange-600 hover:bg-brand/10 dark:text-brand-soft"
                  >
                    <Navigation className="h-5 w-5" />
                  </button>
                </div>
              );
            })
          )}
          {tailgates.some(t => t.location?.lat) && !q && (
            <p className="flex items-center gap-1.5 px-1 text-xs text-on-surface-variant">
              <TailgateIcon className="h-3.5 w-3.5" />Green pins are public tailgates. Tap one for directions.
            </p>
          )}
        </section>
      </main>

      <SafetyButton />
    </div>
  );
}
