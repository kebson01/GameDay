import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, List, Map as MapIcon, Lock, CheckCircle2, Flag, Check } from 'lucide-react';
import { client } from '@/api/client';
import { isCloudEnabled } from '@/lib/supabase';
import { myTailgateRsvpIds } from '@/lib/cloudEntities';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import AppHeader from '@/components/layout/AppHeader';
import TailgateListCard from '@/components/tailgates/TailgateListCard';
import { TAILGATE_TYPES, isPastTailgate, tailgateDayLabel } from '@/components/tailgates/tailgateUtils';
import MapView, { tailgateIcon } from '@/components/map/MapView';
import LoginPrompt from '@/components/auth/LoginPrompt';
import { Skeleton } from '@/components/common/LoadingSkeleton';

export default function TailgateDirectory() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    client.auth.me().then(setUser).catch(() => {});
    navigator.geolocation?.getCurrentPosition(
      (p) => setUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { maximumAge: 60000, timeout: 8000 }
    );
  }, []);

  // Cloud: everything you can see (public + yours + ones you're going to)
  const { data: tailgates = [], isLoading } = useQuery({
    queryKey: ['tailgates'],
    queryFn: () => (isCloudEnabled()
      ? client.entities.Tailgate.list()
      : client.entities.Tailgate.filter({ is_public: true }, '-created_date')),
  });
  const { data: goingIds = [] } = useQuery({
    queryKey: ['my-tailgate-rsvps', user?.id],
    queryFn: myTailgateRsvpIds,
    enabled: isCloudEnabled() && !!user,
  });
  const going = new Set(goingIds);

  const upcoming = useMemo(
    () => tailgates.filter(t => !isPastTailgate(t)).sort((a, b) => (a.game_date || '9999').localeCompare(b.game_date || '9999')),
    [tailgates]
  );

  const filters = [
    { id: 'all', label: `All (${upcoming.length})` },
    { id: 'public', label: 'Public RSVP', icon: CheckCircle2 },
    ...(upcoming.some(t => !t.is_public) ? [{ id: 'private', label: 'Invite only', icon: Lock }] : []),
    ...(going.size ? [{ id: 'going', label: "I'm going", icon: Check }] : []),
    ...TAILGATE_TYPES.filter(tt => tt.value !== 'private' && tt.value !== 'open' && upcoming.some(t => t.type === tt.value))
      .map(tt => ({ id: `type:${tt.value}`, label: `${tt.emoji} ${tt.label}` })),
  ];

  const visible = upcoming.filter(t => {
    if (filter === 'public' && !t.is_public) return false;
    if (filter === 'private' && t.is_public) return false;
    if (filter === 'going' && !going.has(t.id)) return false;
    if (filter.startsWith('type:') && t.type !== filter.slice(5)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return [t.name, t.host_name, t.location?.lot_name, t.description].some(v => v?.toLowerCase().includes(q));
    }
    return true;
  });

  const rsvp = useMutation({
    mutationFn: (t) => (typeof client.entities.Tailgate.rsvp === 'function'
      ? client.entities.Tailgate.rsvp(t.id)
      : client.entities.Tailgate.update(t.id, { rsvp_count: (t.rsvp_count || 0) + 1 })),
    onSuccess: (_d, t) => {
      queryClient.invalidateQueries({ queryKey: ['tailgates'] });
      queryClient.invalidateQueries({ queryKey: ['my-tailgate-rsvps'] });
      toast.success(`You're going to ${t.name}! 🎉`);
    },
    onError: (e) => toast.error(e.message),
  });

  const requireUser = (fn) => (...args) => (user ? fn(...args) : setShowLoginPrompt(true));
  const openTailgate = (t) => navigate(createPageUrl('TailgateDetail') + `?id=${t.id}`);
  const host = requireUser(() => navigate(createPageUrl('CreateTailgate')));

  const markers = visible
    .filter(t => t.location?.lat && t.location?.lng)
    .map(t => ({ id: t.id, lat: t.location.lat, lng: t.location.lng, icon: tailgateIcon, popup: t.name, data: t }));

  return (
    <div className="gd-page">
      <AppHeader
        eyebrow="Stadium Lot Radar"
        title="Tailgates"
        subtitle={`${upcoming.length} upcoming ${upcoming.length === 1 ? 'tailgate' : 'tailgates'}`}
      />

      <main className="space-y-4 px-4 pt-4">
        <div className="flex gap-2">
          <div className="gd-segment flex-1 grid-cols-2" role="tablist" aria-label="View">
            <button role="tab" aria-selected={viewMode === 'list'} onClick={() => setViewMode('list')}><List className="h-4 w-4" />List</button>
            <button role="tab" aria-selected={viewMode === 'map'} onClick={() => setViewMode('map')}><MapIcon className="h-4 w-4" />Map</button>
          </div>
          <button type="button" onClick={host} className="gd-btn-primary flex items-center gap-1.5 rounded-xl px-4 font-display text-lg font-bold uppercase">
            <Plus className="h-5 w-5" />Host
          </button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by host, lot (e.g. Lot 4A) or name"
            className="gd-input pl-12"
            aria-label="Search tailgates"
          />
        </div>

        <div className="gd-chip-row" role="toolbar" aria-label="Filter tailgates">
          {filters.map(({ id, label, icon: Icon }) => (
            <button key={id} className="gd-chip normal-case" aria-pressed={filter === id} onClick={() => setFilter(id)}>
              {Icon && <Icon className="h-3.5 w-3.5" />}{label}
            </button>
          ))}
        </div>

        {viewMode === 'map' ? (
          <div className="gd-card relative h-[60vh] overflow-hidden">
            <MapView
              center={userLocation ? [userLocation.lat, userLocation.lng] : markers[0] ? [markers[0].lat, markers[0].lng] : [33.2084, -87.5503]}
              zoom={15}
              userLocation={userLocation}
              markers={markers}
              onMarkerClick={(m) => setSelected(m.data)}
            />
            {selected && (
              <button
                type="button"
                onClick={() => openTailgate(selected)}
                className="absolute inset-x-3 bottom-3 rounded-xl bg-surface-container/95 p-3 text-left shadow-lg backdrop-blur"
              >
                <p className="font-display text-lg font-bold uppercase text-on-surface">{selected.name}</p>
                <p className="text-xs text-on-surface-variant">{tailgateDayLabel(selected)} · {selected.location?.lot_name} · {selected.rsvp_count || 0} going</p>
              </button>
            )}
          </div>
        ) : isLoading ? (
          <div className="space-y-4">{[1, 2].map(i => <Skeleton key={i} className="h-80 w-full rounded-2xl" />)}</div>
        ) : visible.length === 0 ? (
          <div className="gd-card px-6 py-10 text-center">
            <p className="text-4xl">⛺</p>
            <p className="mt-2 font-display text-xl font-bold uppercase text-on-surface">
              {upcoming.length ? 'No tailgates match' : 'No tailgates yet'}
            </p>
            <p className="mt-1 text-sm text-on-surface-variant">
              {upcoming.length ? 'Try a different filter or search.' : 'Be the first to host one for this game day.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map(t => (
              <TailgateListCard
                key={t.id}
                tailgate={t}
                userLocation={userLocation}
                attending={going.has(t.id)}
                isHost={user && t.host_id === user.id}
                onOpen={openTailgate}
                onRsvp={requireUser((tg) => rsvp.mutate(tg))}
                rsvpPending={rsvp.isPending}
              />
            ))}
          </div>
        )}

        {/* Host call-to-action */}
        <section className="gd-card flex items-start gap-3 p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-orange-600 dark:text-brand-soft">
            <Flag className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-bold uppercase text-on-surface">Setting up your own tent?</h2>
            <p className="text-sm text-on-surface-variant">Drop your spot, list what you're bringing and let your crew RSVP and claim supplies.</p>
            <button type="button" onClick={host} className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-brand/50 px-4 py-2 text-sm font-semibold text-orange-600 dark:text-brand-soft">
              <Plus className="h-4 w-4" />Host a tailgate
            </button>
          </div>
        </section>
      </main>

      <LoginPrompt open={showLoginPrompt} onOpenChange={setShowLoginPrompt} feature="tailgates" onSuccess={setUser} />
    </div>
  );
}
