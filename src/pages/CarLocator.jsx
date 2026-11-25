import React, { useState, useEffect } from 'react';
import { auth } from '@/lib/auth';
import { client } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Car, MapPin, Navigation, Clock, Trash2, Check, Loader2, History, Pencil, Share2, Locate, ParkingSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import AppHeader from '@/components/layout/AppHeader';
import AuthModal from '@/components/auth/AuthModal';
import { Skeleton } from '@/components/common/LoadingSkeleton';
import { SignInCard, EmptyCard, Field } from '@/components/crew-v2/ui';
import { distanceMiles, distanceParts, walkMinutes, agoLabel } from '@/components/crew-v2/geo';
import { openNavigation, getCurrentLocation as getDeviceLocation } from '@/lib/navigation';

const savedAt = (loc) => loc.timestamp || loc.created_date;
const mapsLink = (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

export default function CarLocator() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [notes, setNotes] = useState('');
  const [lotName, setLotName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [editingId, setEditingId] = useState(null); // editing the current spot instead of saving a new one
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    auth.me()
      .then(setUser)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Get user location for navigation and distance
  useEffect(() => {
    getDeviceLocation()
      .then(loc => setUserLocation({ lat: loc.lat, lng: loc.lng }))
      .catch(() => {});
  }, []);

  // Fetch saved car locations
  const { data: savedLocations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ['car-locations', user?.email],
    queryFn: () => user ? client.entities.CarLocation.filter({ user_email: user.email }, '-created_date', 5) : [],
    enabled: !!user,
  });

  const latestLocation = savedLocations[0];

  const resetForm = () => {
    setShowSaveForm(false);
    setEditingId(null);
    setNotes('');
    setLotName('');
  };

  // Save mutation (new spot, or update of the current one while editing)
  const saveMutation = useMutation({
    mutationFn: ({ id, data }) => (id ? client.entities.CarLocation.update(id, data) : client.entities.CarLocation.create(data)),
    onSuccess: (_d, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['car-locations'] });
      toast.success(id ? 'Parking spot updated!' : 'Car location saved!');
      resetForm();
    },
    onError: () => {
      toast.error('Failed to save location');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => client.entities.CarLocation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['car-locations'] });
      toast.success('Location deleted');
    },
  });

  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      const location = await getDeviceLocation();
      setCurrentLocation({ lat: location.lat, lng: location.lng });
      setShowSaveForm(true);
    } catch (error) {
      toast.error('Could not get your location. Please enable location permissions.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const startNewSpot = () => {
    setEditingId(null);
    setLotName('');
    setNotes('');
    getCurrentLocation();
  };

  const startEdit = () => {
    setEditingId(latestLocation.id);
    setLotName(latestLocation.lot_name || '');
    setNotes(latestLocation.notes || '');
    setCurrentLocation({ lat: latestLocation.latitude, lng: latestLocation.longitude });
    setShowSaveForm(true);
  };

  const handleSave = () => {
    if (!currentLocation) return;
    if (editingId) {
      saveMutation.mutate({
        id: editingId,
        data: { latitude: currentLocation.lat, longitude: currentLocation.lng, lot_name: lotName || 'My Car', notes },
      });
      return;
    }
    saveMutation.mutate({
      data: {
        user_email: user.email,
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
        lot_name: lotName || 'My Car',
        notes: notes,
        timestamp: new Date().toISOString(),
      },
    });
  };

  const handleNavigation = async (lat, lng, name = 'Car Location') => {
    try {
      await openNavigation(lat, lng, name, userLocation);
    } catch (error) {
      toast.error('Could not open navigation');
    }
  };

  const shareSpot = async (loc) => {
    const url = mapsLink(loc.latitude, loc.longitude);
    const text = `I'm parked at ${loc.lot_name || 'my car'}${loc.notes ? ` (${loc.notes})` : ''}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'My parking spot', text, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard?.writeText(`${text}: ${url}`);
      toast.success('Spot link copied to clipboard');
    }
  };

  const header = <AppHeader eyebrow="Parking" title="Find My Car" subtitle="Never forget where you parked" back />;

  if (loading) {
    return (
      <div className="gd-page">
        {header}
        <main className="space-y-4 px-4 pt-4">
          <Skeleton className="h-72 w-full rounded-2xl" />
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="gd-page">
        {header}
        <main className="space-y-4 px-4 pt-4">
          <SignInCard
            icon={Car}
            text="Sign in to save your parking spot and get walking directions back to it after the game."
            onSignIn={() => setShowAuthModal(true)}
          />
        </main>
        <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} onSuccess={setUser} feature="car location" />
      </div>
    );
  }

  const mi = latestLocation ? distanceMiles(userLocation, { lat: latestLocation.latitude, lng: latestLocation.longitude }) : null;
  const dist = distanceParts(mi);
  const walk = walkMinutes(mi);
  const lotTitle = latestLocation?.lot_name || 'My Car';

  return (
    <div className="gd-page">
      {header}

      <main className="space-y-4 px-4 pt-4">
        {locationsLoading && <Skeleton className="h-72 w-full rounded-2xl" />}

        {/* Current vehicle */}
        {latestLocation && !showSaveForm && (
          <section className="gd-card gd-card-glow overflow-hidden p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="gd-pill bg-brand text-white">Current vehicle</span>
                <p className="mt-1.5 text-xs text-on-surface-variant">
                  Parked {format(new Date(savedAt(latestLocation)), "EEE, MMM d 'at' h:mm a")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 rounded-xl bg-surface-container-high px-3 py-1.5 text-sm font-semibold text-on-surface dark:bg-surface-container-highest">
                <Clock className="h-4 w-4 text-amber-600 dark:text-brand-highlight" />
                {agoLabel(savedAt(latestLocation))}
              </div>
            </div>

            <h2 className="mt-3 break-words font-display text-4xl font-extrabold uppercase leading-none text-on-surface">
              {lotTitle}
            </h2>

            {dist && (
              <p className="mt-2 flex items-baseline gap-2">
                <span className="gd-score text-2xl text-orange-600 dark:text-brand-soft">
                  {dist.value} <span className="text-base uppercase">{dist.unit}</span>
                </span>
                <span className="text-sm text-on-surface-variant">from you{walk ? ` · ~${walk} min walk` : ''}</span>
              </p>
            )}

            {latestLocation.notes && (
              <div className="mt-3 flex gap-3 rounded-xl bg-surface-container-high p-3 dark:bg-surface">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-brand-highlight" />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-brand-highlight">Landmark</p>
                  <p className="text-sm text-on-surface">{latestLocation.notes}</p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => handleNavigation(latestLocation.latitude, latestLocation.longitude, lotTitle)}
              className="gd-btn-primary mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-xl font-display text-xl font-bold uppercase"
            >
              <Navigation className="h-5 w-5" />Navigate to my car
            </button>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={startEdit}
                className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-surface-container-high text-sm font-semibold text-on-surface dark:bg-surface-container-highest"
              >
                <Pencil className="h-4 w-4" />Edit
              </button>
              <button
                type="button"
                onClick={() => shareSpot(latestLocation)}
                className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-surface-container-high text-sm font-semibold text-on-surface dark:bg-surface-container-highest"
              >
                <Share2 className="h-4 w-4" />Share
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(latestLocation.id)}
                className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-red-500/10 text-sm font-semibold text-red-600 dark:text-red-400"
              >
                <Trash2 className="h-4 w-4" />Delete
              </button>
            </div>
          </section>
        )}

        {/* Save / edit form */}
        {showSaveForm && currentLocation && (
          <section className="gd-card space-y-4 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold uppercase text-on-surface">
                {editingId ? 'Edit parking spot' : 'Save car location'}
              </h2>
              <button type="button" onClick={resetForm} className="text-sm font-semibold text-on-surface-variant hover:text-on-surface">
                Cancel
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-brand-win">
                  <Check className="h-4 w-4" />{editingId ? 'Saved position' : 'Location captured'}
                </p>
                <p className="mt-0.5 font-mono text-xs text-on-surface-variant">
                  {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                </p>
              </div>
              {editingId && (
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  disabled={isGettingLocation}
                  className="flex shrink-0 items-center gap-1 rounded-lg bg-surface-container px-2.5 py-1.5 text-xs font-semibold text-on-surface disabled:opacity-50"
                >
                  {isGettingLocation ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Locate className="h-3.5 w-3.5" />}
                  Use my GPS
                </button>
              )}
            </div>

            <Field label="Lot / area name" htmlFor="car-lot">
              <input
                id="car-lot"
                className="gd-input"
                placeholder="e.g., Lot 4B, Row 12"
                value={lotName}
                onChange={(e) => setLotName(e.target.value)}
              />
            </Field>
            <Field label="Landmark notes (optional)" htmlFor="car-notes">
              <textarea
                id="car-notes"
                className="gd-input h-auto min-h-[88px] py-3"
                placeholder="e.g., Next to the big oak tree, by exit ramp 3"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </Field>

            <button
              type="button"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="gd-btn-primary flex h-12 w-full items-center justify-center gap-2 rounded-xl font-display text-lg font-bold uppercase disabled:opacity-60"
            >
              {saveMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Check className="h-5 w-5" />{editingId ? 'Save changes' : 'Save location'}</>}
            </button>
          </section>
        )}

        {/* Drop a new pin */}
        {!showSaveForm && !locationsLoading && (
          <section className="gd-card p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand/15 font-display text-2xl font-extrabold text-orange-600 dark:text-brand-soft">
                P
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-lg font-bold uppercase leading-tight text-on-surface">
                  {latestLocation ? 'Parked somewhere new?' : 'Just parked?'}
                </h2>
                <p className="text-xs text-on-surface-variant">Save your spot with GPS in one tap</p>
              </div>
            </div>
            <button
              type="button"
              onClick={startNewSpot}
              disabled={isGettingLocation}
              className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-brand/50 text-sm font-bold text-orange-600 disabled:opacity-60 dark:text-brand-soft"
            >
              {isGettingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              Drop pin here
            </button>
          </section>
        )}

        {/* Empty State */}
        {!latestLocation && !showSaveForm && !locationsLoading && (
          <EmptyCard icon={ParkingSquare} title="No saved spots" text="Tap Drop pin when you park and we'll guide you back after the game." />
        )}

        {/* History */}
        {savedLocations.length > 1 && (
          <section className="space-y-2">
            <h2 className="font-display text-lg font-bold uppercase text-on-surface">Recent spots</h2>
            {savedLocations.slice(1).map((location) => (
              <div key={location.id} className="gd-card flex items-center gap-3 p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-container-high text-on-surface-variant dark:bg-surface-container-highest">
                  <History className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-on-surface">{location.lot_name || 'Saved Location'}</p>
                  <p className="truncate text-xs text-on-surface-variant">
                    {format(new Date(savedAt(location)), 'EEE, MMM d · h:mm a')}{location.notes ? ` · ${location.notes}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Navigate to ${location.lot_name || 'saved location'}`}
                  onClick={() => handleNavigation(location.latitude, location.longitude, location.lot_name || 'Saved Location')}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-orange-600 hover:bg-brand/10 dark:text-brand-soft"
                >
                  <Navigation className="h-5 w-5" />
                </button>
              </div>
            ))}
          </section>
        )}
      </main>

    </div>
  );
}
