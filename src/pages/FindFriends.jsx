import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import {
  Users, Plus, RefreshCw, Navigation, Share2, Copy, Check, WifiOff,
  ChevronDown, UserPlus, Ghost, Radar, KeyRound, Clock,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import GoogleMapView, { markerIcons } from '@/components/map/GoogleMapView';
import SafetyButton from '@/components/common/SafetyButton';
import InviteContacts from '@/components/friends/InviteContacts';
import LoginPrompt from '@/components/auth/LoginPrompt';
import AppHeader from '@/components/layout/AppHeader';
import { GdSwitch, EmptyCard } from '@/components/crew-v2/ui';
import { distanceMiles, distanceParts, walkMinutes, agoLabel } from '@/components/crew-v2/geo';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import offlineStorage from '@/lib/offlineStorage';
import { openNavigation, watchLocation } from '@/lib/navigation';

const FRIEND_COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6'];

const friendName = (f) => f?.display_name || f?.email?.split('@')[0] || 'Friend';
const initialsOf = (name) =>
  name.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase() || '??';

export default function FindFriends() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [sharingEnabled, setSharingEnabled] = useState(true);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [pendingGroup, setPendingGroup] = useState(null); // just created/joined, before the list refetches
  const { isOnline } = useNetworkStatus();

  // Get current user
  useEffect(() => {
    client.auth.me().then(setUser).catch(() => setShowLoginPrompt(true));
  }, []);

  // Watch user location
  useEffect(() => {
    const stopWatching = watchLocation(
      (location) => setUserLocation({ lat: location.lat, lng: location.lng, accuracy: location.accuracy }),
      (error) => console.error('Location error:', error)
    );
    return stopWatching;
  }, []);

  // Update user location in database
  useEffect(() => {
    if (!user || !userLocation || !sharingEnabled || !isOnline) return;

    const updateLocation = async () => {
      try {
        const existing = await client.entities.UserLocation.filter({ user_id: user.id });
        const data = {
          user_id: user.id,
          email: user.email,
          lat: userLocation.lat,
          lng: userLocation.lng,
          accuracy: userLocation.accuracy,
          sharing_enabled: sharingEnabled,
          last_updated: new Date().toISOString(),
          status: 'active',
        };
        if (existing.length > 0) {
          await client.entities.UserLocation.update(existing[0].id, data);
        } else {
          await client.entities.UserLocation.create(data);
        }
      } catch (error) {
        console.error('Failed to update location:', error);
      }
    };

    updateLocation();
    const interval = setInterval(updateLocation, 30000);
    return () => clearInterval(interval);
  }, [user, userLocation, sharingEnabled, isOnline]);

  // Turning sharing off hides your last known spot from the crew (previously it stayed visible)
  useEffect(() => {
    if (!user || sharingEnabled || !isOnline) return;
    (async () => {
      try {
        const existing = await client.entities.UserLocation.filter({ user_id: user.id });
        if (existing.length > 0) {
          await client.entities.UserLocation.update(existing[0].id, { sharing_enabled: false });
        }
      } catch (error) {
        console.error('Failed to hide location:', error);
      }
    })();
  }, [user, sharingEnabled, isOnline]);

  // Fetch user's groups
  const { data: groups = [] } = useQuery({
    queryKey: ['my-groups', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const allGroups = await client.entities.TailgateGroup.list();
      return allGroups.filter(g => g.members?.some(m => m.email === user.email));
    },
    enabled: !!user,
  });

  const activeGroup = groups.find(g => g.id === activeGroupId)
    || (pendingGroup?.id === activeGroupId ? pendingGroup : null)
    || groups[0]
    || null;

  // Fetch friend locations with offline support
  const { data: friendLocations = [], refetch: refetchLocations, isFetching } = useOfflineQuery({
    queryKey: ['friend-locations', activeGroup?.id],
    queryFn: async () => {
      if (!activeGroup) return [];
      const memberEmails = activeGroup.members?.map(m => m.email) || [];
      const locations = await client.entities.UserLocation.filter({ sharing_enabled: true });
      return locations.filter(l => memberEmails.includes(l.email) && l.email !== user?.email);
    },
    offlineGetter: () => offlineStorage.getFriendLocations(),
    offlineSetter: (locations) => offlineStorage.saveFriendLocations(locations),
    enabled: !!activeGroup,
    refetchInterval: isOnline ? 10000 : false,
  });

  // Stable colour per friend, list sorted nearest first
  const crew = useMemo(() => {
    const list = friendLocations.map((f, idx) => {
      const mi = distanceMiles(userLocation, f);
      return { ...f, color: FRIEND_COLORS[idx % FRIEND_COLORS.length], name: friendName(f), mi };
    });
    return list.sort((a, b) => (a.mi ?? Infinity) - (b.mi ?? Infinity));
  }, [friendLocations, userLocation]);

  const sharingEmails = new Set(friendLocations.map(f => f.email));
  const notSharing = (activeGroup?.members || []).filter(m => m.email !== user?.email && !sharingEmails.has(m.email));

  // Create new group
  const createGroupMutation = useMutation({
    mutationFn: async () => {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      return client.entities.TailgateGroup.create({
        name: `${user.full_name?.split(' ')[0] || 'My'}'s Crew`,
        owner_id: user.id,
        invite_code: code,
        avatar_emoji: '🏈',
        color: '#FF6B35',
        members: [{ user_id: user.id, email: user.email, role: 'admin', location_sharing: true }],
      });
    },
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      setPendingGroup(group);
      setActiveGroupId(group?.id);
      toast.success('Group created!');
    },
    onError: (error) => toast.error(error.message),
  });

  // Join group
  const joinGroupMutation = useMutation({
    mutationFn: async (code) => {
      // Cloud: the server validates the code and adds you (you can't see a group before joining)
      if (typeof client.entities.TailgateGroup.join === 'function') {
        return client.entities.TailgateGroup.join(code.trim());
      }
      const found = await client.entities.TailgateGroup.filter({ invite_code: code.toUpperCase() });
      if (found.length === 0) throw new Error('Invalid code');

      const group = found[0];
      if (group.members?.some(m => m.email === user.email)) {
        throw new Error('Already in group');
      }
      return client.entities.TailgateGroup.update(group.id, {
        members: [...(group.members || []), { user_id: user.id, email: user.email, role: 'member', location_sharing: true }],
      });
    },
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      if (group?.id) {
        setPendingGroup(group);
        setActiveGroupId(group.id);
      }
      setShowJoinDialog(false);
      setJoinCode('');
      toast.success('Joined group!');
    },
    onError: (error) => toast.error(error.message),
  });

  const copyInviteCode = () => {
    navigator.clipboard?.writeText(activeGroup?.invite_code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareInviteCode = async () => {
    const text = `Join my crew "${activeGroup.name}" on GameDay with code ${activeGroup.invite_code}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'GameDay crew', text }); } catch { /* cancelled */ }
    } else {
      navigator.clipboard?.writeText(text);
      toast.success('Invite copied to clipboard');
    }
  };

  const guideTo = async (friend) => {
    try {
      await openNavigation(friend.lat, friend.lng, friend.name, userLocation);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  // Generate markers for map
  const markers = crew.map((friend) => ({
    id: friend.id,
    lat: friend.lat,
    lng: friend.lng,
    icon: markerIcons.friend(friend.color),
    popup: friend.name,
    data: friend,
  }));

  // Show login prompt if user is not authenticated
  if (!user) {
    return (
      <LoginPrompt
        open={showLoginPrompt}
        onOpenChange={(open) => {
          setShowLoginPrompt(open);
          if (!open) navigate(createPageUrl('Home'));
        }}
        feature="friend tracking and location sharing"
      />
    );
  }

  const headerActions = (
    <>
      {!isOnline && (
        <span className="gd-pill bg-amber-500/15 text-amber-700 dark:text-brand-highlight">
          <WifiOff className="h-3 w-3" />Offline
        </span>
      )}
      {activeGroup && (
        <button
          type="button"
          onClick={() => refetchLocations()}
          disabled={!isOnline}
          aria-label="Refresh friend locations"
          className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface disabled:opacity-40"
        >
          <RefreshCw className={`h-5 w-5 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      )}
    </>
  );

  return (
    <div className="gd-page">
      <AppHeader eyebrow="Crew Locator" title="Find Friends" back="Home" actions={headerActions} />

      <main className="space-y-4 px-4 pt-4">
        {/* Group switcher + join */}
        {groups.length > 0 && activeGroup && (
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Switch crew (current: ${activeGroup.name})`}
                  className="gd-card flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-3 py-2"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg"
                    style={{ backgroundColor: activeGroup.color || '#FF6B35' }}
                    aria-hidden="true"
                  >
                    {activeGroup.avatar_emoji || '🏈'}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-left font-display text-xl font-bold uppercase text-on-surface">
                    {activeGroup.name}
                  </span>
                  <span className="gd-pill shrink-0 bg-emerald-500/15 text-emerald-700 dark:text-brand-win">
                    {friendLocations.length} live
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-on-surface-variant" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel>Your crews</DropdownMenuLabel>
                {groups.map(g => (
                  <DropdownMenuItem key={g.id} onSelect={() => setActiveGroupId(g.id)} className="gap-2">
                    <span aria-hidden="true">{g.avatar_emoji || '🏈'}</span>
                    <span className="flex-1 truncate">{g.name}</span>
                    <span className="text-xs text-muted-foreground">{g.members?.length || 0}</span>
                    {g.id === activeGroup.id && <Check className="h-4 w-4" />}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => createGroupMutation.mutate()} disabled={!isOnline || createGroupMutation.isPending} className="gap-2">
                  <Plus className="h-4 w-4" />Create a new crew
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              type="button"
              onClick={() => setShowJoinDialog(true)}
              disabled={!isOnline}
              className="gd-btn-primary flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-sm font-bold disabled:opacity-50"
            >
              <UserPlus className="h-4 w-4" />Join / Code
            </button>
          </div>
        )}

        {/* Location sharing */}
        <div className="gd-card flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {sharingEnabled ? (
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
            ) : (
              <Ghost className="h-4 w-4 shrink-0 text-on-surface-variant" />
            )}
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${sharingEnabled ? 'text-emerald-700 dark:text-brand-win' : 'text-on-surface'}`}>
                {sharingEnabled ? 'Location sharing live' : 'Ghost mode'}
              </p>
              <p className="truncate text-xs text-on-surface-variant">
                {sharingEnabled ? 'Your crews can see where you are' : 'Your location is hidden from your crews'}
              </p>
            </div>
          </div>
          <GdSwitch checked={sharingEnabled} onCheckedChange={setSharingEnabled} aria-label="Share location" />
        </div>

        {groups.length === 0 ? (
          <EmptyCard icon={Users} title="No crew yet" text="Create a crew and share the code, or join one with a code from a friend.">
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => createGroupMutation.mutate()}
                disabled={createGroupMutation.isPending || !isOnline}
                className="gd-btn-primary flex h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-bold disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />Create crew
              </button>
              <button
                type="button"
                onClick={() => setShowJoinDialog(true)}
                disabled={!isOnline}
                className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-outline-variant text-sm font-semibold text-on-surface disabled:opacity-50 dark:border-white/[0.12]"
              >
                <KeyRound className="h-4 w-4" />Join with code
              </button>
            </div>
          </EmptyCard>
        ) : activeGroup && (
          <>
            {/* Map */}
            <div className="gd-card relative h-72 overflow-hidden">
              <GoogleMapView
                center={userLocation ? [userLocation.lat, userLocation.lng] : crew[0] ? [crew[0].lat, crew[0].lng] : [33.2084, -87.5503]}
                zoom={16}
                userLocation={userLocation}
                markers={markers}
                className="rounded-none"
              />
              <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-3 rounded-full bg-surface/90 px-3 py-1.5 text-xs font-semibold text-on-surface shadow backdrop-blur">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#FF6B35]" />You</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#3B82F6]" />Crew ({crew.length})</span>
              </div>
            </div>

            {/* Crew proximity */}
            <section className="space-y-3">
              <div className="flex items-end justify-between">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold uppercase text-on-surface">
                  <Radar className="h-5 w-5 text-orange-600 dark:text-brand-soft" />Crew proximity
                </h2>
                {crew.length > 1 && userLocation && (
                  <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Sorted by distance</span>
                )}
              </div>

              {crew.length === 0 ? (
                <EmptyCard icon={Navigation} title="Nobody sharing yet" text="Crew members show up here once they open Find Friends with location sharing on." />
              ) : (
                crew.map((friend) => {
                  const parts = distanceParts(friend.mi);
                  const walk = walkMinutes(friend.mi);
                  const updated = agoLabel(friend.last_updated);
                  return (
                    <article key={friend.id} className="gd-card p-4">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <div
                            className="flex h-12 w-12 items-center justify-center rounded-full font-display text-lg font-bold text-white"
                            style={{ backgroundColor: friend.color }}
                            aria-hidden="true"
                          >
                            {initialsOf(friend.name)}
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface-container bg-emerald-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[17px] font-bold text-on-surface">{friend.name}</p>
                          {updated && (
                            <p className="flex items-center gap-1 text-xs text-on-surface-variant">
                              <Clock className="h-3 w-3" />Updated {updated}
                            </p>
                          )}
                        </div>
                        {parts && (
                          <div className="shrink-0 text-right">
                            <p className="gd-score text-3xl leading-none text-on-surface">
                              {parts.value}<span className="ml-0.5 text-sm uppercase text-on-surface-variant">{parts.unit}</span>
                            </p>
                            {walk && <p className="mt-0.5 text-[11px] font-semibold text-emerald-700 dark:text-brand-win">~{walk} min walk</p>}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => guideTo(friend)}
                        className="gd-btn-primary mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-bold"
                      >
                        <Navigation className="h-4 w-4" />Guide me to {friend.name.split(' ')[0]}
                      </button>
                    </article>
                  );
                })
              )}

              {notSharing.length > 0 && (
                <div className="gd-card px-4 py-3">
                  <p className="gd-eyebrow !text-on-surface-variant">Not sharing right now</p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {notSharing.map(m => (
                      <li key={m.user_id || m.email} className="flex items-center gap-1.5 rounded-full bg-surface-container-high px-2.5 py-1 text-xs font-medium text-on-surface-variant dark:bg-surface-container-highest">
                        <Ghost className="h-3 w-3" />{friendName(m)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* Invite code */}
            {activeGroup.invite_code && (
              <section className="gd-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display text-lg font-bold uppercase text-on-surface">Crew passcode</h2>
                    <p className="text-xs text-on-surface-variant">Friends enter this code to join {activeGroup.name}.</p>
                  </div>
                  <p className="gd-score shrink-0 rounded-xl border border-brand/40 bg-brand/10 px-3 py-1.5 text-2xl tracking-[0.15em] text-orange-600 dark:text-brand-soft">
                    {activeGroup.invite_code}
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={copyInviteCode}
                    className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-surface-container-high text-sm font-semibold text-on-surface dark:bg-surface-container-highest"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copied!' : 'Copy code'}
                  </button>
                  <button
                    type="button"
                    onClick={shareInviteCode}
                    className="gd-btn-primary flex h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-bold"
                  >
                    <Share2 className="h-4 w-4" />Share
                  </button>
                </div>
                <div className="mt-2 [&>button]:h-11 [&>button]:w-full [&>button]:rounded-xl">
                  <InviteContacts groupId={activeGroup.id} groupName={activeGroup.name} inviteCode={activeGroup.invite_code} />
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Join Group Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent className="bg-surface-container">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-bold uppercase">Join a crew</DialogTitle>
            <DialogDescription>Enter the invite code shared by your friend.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4 py-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (joinCode.length >= 6) joinGroupMutation.mutate(joinCode);
            }}
          >
            <input
              placeholder="ABC123"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="gd-input gd-score h-14 text-center text-3xl tracking-[0.3em]"
              maxLength={6}
              aria-label="Invite code"
              autoFocus
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowJoinDialog(false)}
                className="h-11 rounded-xl border border-outline-variant text-sm font-semibold text-on-surface dark:border-white/[0.12]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={joinCode.length < 6 || joinGroupMutation.isPending}
                className="gd-btn-primary h-11 rounded-xl text-sm font-bold disabled:opacity-50"
              >
                {joinGroupMutation.isPending ? 'Joining...' : 'Join'}
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowJoinDialog(false);
                createGroupMutation.mutate();
              }}
              className="w-full text-center text-sm font-semibold text-orange-600 dark:text-brand-soft"
            >
              or create a new crew instead
            </button>
          </form>
        </DialogContent>
      </Dialog>

      <LoginPrompt
        open={showLoginPrompt}
        onOpenChange={(open) => {
          setShowLoginPrompt(open);
          if (!open && !user) navigate(createPageUrl('Home'));
        }}
        feature="friend tracking and location sharing"
      />

      <SafetyButton />
    </div>
  );
}
