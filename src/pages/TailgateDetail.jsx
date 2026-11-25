import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Share2, Pencil, Clock, MapPin, Navigation, Copy, Users, Lock, CheckCircle2,
  Plus, Trash2, Check, UserPlus, ListChecks, Sparkles, KeyRound,
} from 'lucide-react';
import { client } from '@/api/client';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import MapView, { tailgateIcon } from '@/components/map/MapView';
import SafetyButton from '@/components/common/SafetyButton';
import LoginPrompt from '@/components/auth/LoginPrompt';
import CrewChat from '@/components/tailgates/CrewChat';
import { amenityInfo, distanceLabel, tailgateDayLabel, timeRange, TAILGATE_TYPES } from '@/components/tailgates/tailgateUtils';
import { openNavigation, getCurrentLocation as getDeviceLocation } from '@/lib/navigation';

export default function TailgateDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [newItem, setNewItem] = useState('');

  const tailgateId = new URLSearchParams(window.location.search).get('id');

  useEffect(() => {
    client.auth.me().then(setUser).catch(() => {});
    getDeviceLocation().then(loc => setUserLocation({ lat: loc.lat, lng: loc.lng })).catch(() => {});
  }, []);

  const { data: tailgate, isLoading } = useQuery({
    queryKey: ['tailgate', tailgateId],
    queryFn: () => client.entities.Tailgate.filter({ id: tailgateId }).then(r => r[0]),
    enabled: !!tailgateId,
  });

  const isHost = !!user && user.id === tailgate?.host_id;
  const serverRsvp = typeof client.entities.Tailgate.rsvp === 'function';

  const { data: isAttending = false } = useQuery({
    queryKey: ['tailgate-attending', tailgateId, user?.id],
    queryFn: () => client.entities.Tailgate.isAttending(tailgateId),
    enabled: !!tailgateId && !!user && serverRsvp,
  });
  const isCrew = isHost || isAttending;
  const needsPasscode = serverRsvp && tailgate && !tailgate.is_public && !isCrew;
  const full = tailgate?.capacity && tailgate.rsvp_count >= tailgate.capacity;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['tailgate', tailgateId] });
    queryClient.invalidateQueries({ queryKey: ['tailgate-attending', tailgateId] });
    queryClient.invalidateQueries({ queryKey: ['tailgates'] });
    queryClient.invalidateQueries({ queryKey: ['my-tailgate-rsvps'] });
  };

  const rsvp = useMutation({
    mutationFn: () => (serverRsvp
      ? client.entities.Tailgate.rsvp(tailgateId, passcode)
      : client.entities.Tailgate.update(tailgateId, { rsvp_count: (tailgate?.rsvp_count || 0) + 1 })),
    onSuccess: () => { refresh(); setPasscode(''); toast.success("You're in! See you there 🎉"); },
    onError: (e) => toast.error(e.message),
  });
  const cancelRsvp = useMutation({
    mutationFn: () => client.entities.Tailgate.cancelRsvp(tailgateId),
    onSuccess: () => { refresh(); toast.success('RSVP cancelled'); },
    onError: (e) => toast.error(e.message),
  });

  // Supply checklist: host and guests can add, claim and tick items
  const saveChecklist = useMutation({
    mutationFn: (checklist) => client.entities.Tailgate.update(tailgateId, { checklist }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tailgate', tailgateId] }),
    onError: (e) => toast.error(e.message),
  });
  const checklist = tailgate?.checklist || [];
  const canEditList = isHost || (serverRsvp && isAttending);
  const myName = user?.full_name || user?.email?.split('@')[0] || 'Me';
  const updateItem = (i, patch) => saveChecklist.mutate(checklist.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const addItem = () => {
    if (!newItem.trim()) return;
    saveChecklist.mutate([...checklist, { item: newItem.trim(), assigned_to: '', completed: false }]);
    setNewItem('');
  };
  const claimed = checklist.filter(it => it.assigned_to || it.completed).length;

  const share = () => {
    const url = window.location.href;
    navigator.share?.({ title: tailgate?.name, text: `Join me at ${tailgate?.name}`, url }).catch(() => {
      navigator.clipboard?.writeText(url);
      toast.success('Link copied');
    }) ?? (navigator.clipboard?.writeText(url), toast.success('Link copied'));
  };
  const directions = async () => {
    try {
      await openNavigation(tailgate.location.lat, tailgate.location.lng, tailgate.name, userLocation);
    } catch {
      toast.error('Could not open directions');
    }
  };
  const copyPin = () => {
    const { lat, lng } = tailgate.location;
    navigator.clipboard?.writeText(`https://maps.google.com/?q=${lat},${lng}`);
    toast.success('Map pin copied');
  };

  if (isLoading) {
    return <div className="gd-page flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" /></div>;
  }
  if (!tailgate) {
    return (
      <div className="gd-page flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-5xl">⛺</p>
        <p className="font-display text-2xl font-bold uppercase text-on-surface">Tailgate not found</p>
        <button className="gd-btn-primary rounded-xl px-5 py-3" onClick={() => navigate(createPageUrl('TailgateDirectory'))}>Browse tailgates</button>
      </div>
    );
  }

  const type = TAILGATE_TYPES.find(t => t.value === tailgate.type);
  const dist = distanceLabel(userLocation, tailgate.location);
  const hasPin = tailgate.location?.lat && tailgate.location?.lng;

  return (
    <div className="gd-page">
      {/* Hero */}
      <div className="relative h-72 bg-gradient-to-br from-orange-500 via-red-500 to-ink-900">
        {tailgate.photo_url && <img src={tailgate.photo_url} alt="" className="h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-black/30 to-black/40" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <button aria-label="Back" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(createPageUrl('TailgateDirectory')))}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/45 text-white backdrop-blur">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex gap-2">
            {isHost && (
              <button aria-label="Edit tailgate" onClick={() => navigate(createPageUrl('CreateTailgate') + `?edit=${tailgateId}`)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/45 text-white backdrop-blur">
                <Pencil className="h-5 w-5" />
              </button>
            )}
            <button aria-label="Share" onClick={share} className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/45 text-white backdrop-blur">
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="absolute inset-x-4 bottom-4">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {tailgate.is_public
              ? <span className="gd-pill bg-emerald-600 text-white"><CheckCircle2 className="h-3 w-3" />Public</span>
              : <span className="gd-pill bg-amber-400 text-ink-900"><Lock className="h-3 w-3" />Invite only</span>}
            {tailgate.location?.lot_name && <span className="gd-pill bg-black/60 text-white normal-case tracking-normal"><MapPin className="h-3 w-3" />{tailgate.location.lot_name}{dist ? ` · ${dist}` : ''}</span>}
            {type && type.value !== 'open' && type.value !== 'private' && <span className="gd-pill bg-black/60 text-white normal-case tracking-normal">{type.emoji} {type.label}</span>}
          </div>
          <h1 className="font-display text-[32px] font-extrabold uppercase leading-[1.02] text-on-surface drop-shadow">{tailgate.name}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-on-surface">
            <Clock className="h-4 w-4 text-orange-500" />{tailgateDayLabel(tailgate)} · {timeRange(tailgate)}
          </p>
        </div>
      </div>

      <main className="space-y-4 px-4 pt-3">
        {/* Host + RSVP */}
        <section className="gd-card space-y-4 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand font-display text-lg font-bold text-white ring-2 ring-brand/40">
              {tailgate.host_name?.charAt(0)?.toUpperCase() || '🏈'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-on-surface">{tailgate.host_name || 'Host'}</p>
              <p className="text-xs text-on-surface-variant">{isHost ? 'You are hosting' : 'Tailgate host'}</p>
            </div>
            <div className="text-right">
              <p className="flex items-center justify-end gap-1 font-display text-2xl font-extrabold text-on-surface">
                <Users className="h-5 w-5 text-orange-500" />{tailgate.rsvp_count || 0}
              </p>
              <p className="text-[11px] uppercase tracking-wider text-on-surface-variant">{tailgate.capacity ? `of ${tailgate.capacity} going` : 'going'}</p>
            </div>
          </div>
          {tailgate.capacity > 0 && (
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-container-high">
              <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, ((tailgate.rsvp_count || 0) / tailgate.capacity) * 100)}%` }} />
            </div>
          )}

          {isHost ? null : isAttending ? (
            <div className="flex gap-2">
              <div className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600/15 font-display text-lg font-bold uppercase text-emerald-700 dark:text-brand-win">
                <Check className="h-5 w-5" />You're going
              </div>
              <button onClick={() => cancelRsvp.mutate()} disabled={cancelRsvp.isPending}
                className="h-12 rounded-xl border border-outline-variant px-4 text-sm font-semibold text-on-surface-variant dark:border-white/[0.08]">
                Cancel RSVP
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {needsPasscode && (
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-500" />
                  <input id="tailgate-passcode" value={passcode} onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter the host's passcode" autoComplete="off" className="gd-input pl-11" aria-label="Passcode" />
                </div>
              )}
              <button
                onClick={() => (user ? rsvp.mutate() : setShowLoginPrompt(true))}
                disabled={rsvp.isPending || full || (needsPasscode && !passcode)}
                className="gd-btn-primary flex h-12 w-full items-center justify-center gap-2 rounded-xl font-display text-xl font-bold uppercase tracking-wide disabled:opacity-50"
              >
                <UserPlus className="h-5 w-5" />{full ? 'Tailgate is full' : rsvp.isPending ? 'Joining…' : "I'm going!"}
              </button>
            </div>
          )}
        </section>

        {tailgate.description && (
          <section className="gd-card p-4">
            <h2 className="mb-1.5 font-display text-lg font-bold uppercase text-on-surface">About</h2>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-on-surface-variant">{tailgate.description}</p>
          </section>
        )}

        {/* Location */}
        <section className="gd-card overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold uppercase text-on-surface"><MapPin className="h-5 w-5 text-orange-500" />Location</h2>
            {dist && <span className="gd-pill bg-emerald-600/15 text-emerald-700 dark:text-brand-win">{dist} away</span>}
          </div>
          <div className="px-4 pb-3 pt-1.5">
            <p className="font-semibold text-on-surface">{tailgate.location?.lot_name || (needsPasscode ? 'Shown after you RSVP with the passcode' : 'Location details')}</p>
            {tailgate.location?.description && <p className="text-sm text-on-surface-variant">🚩 {tailgate.location.description}</p>}
          </div>
          {hasPin && (
            <>
              {/* Map preview only when a Google Maps key is configured */}
              {import.meta.env.VITE_GOOGLE_MAPS_API_KEY && <div className="h-44 w-full"><MapView center={[tailgate.location.lat, tailgate.location.lng]} zoom={16} userLocation={userLocation}
                markers={[{ id: tailgate.id, lat: tailgate.location.lat, lng: tailgate.location.lng, icon: tailgateIcon, popup: tailgate.name }]} /></div>}
              <div className="flex gap-2 p-3">
                <button onClick={directions} className="gd-btn-primary flex h-11 flex-1 items-center justify-center gap-2 rounded-xl"><Navigation className="h-4 w-4" />Directions</button>
                <button onClick={copyPin} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-outline-variant px-4 text-sm font-semibold text-on-surface dark:border-white/[0.08]"><Copy className="h-4 w-4" />Copy pin</button>
              </div>
            </>
          )}
        </section>

        {/* What's at this tailgate */}
        {tailgate.amenities?.length > 0 && (
          <section className="gd-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold uppercase text-on-surface"><Sparkles className="h-5 w-5 text-amber-500" />What's here</h2>
              <span className="text-xs text-on-surface-variant">{tailgate.amenities.length} setups</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {tailgate.amenities.map(a => {
                const info = amenityInfo(a);
                return (
                  <div key={a} className="flex items-center gap-2.5 rounded-xl bg-surface-container-high p-2.5">
                    <span className="text-xl">{info.emoji}</span>
                    <span className="text-sm font-semibold text-on-surface">{info.label}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Crew supply checklist */}
        <section className="gd-card p-4">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold uppercase text-on-surface"><ListChecks className="h-5 w-5 text-orange-500" />Supply checklist</h2>
            {checklist.length > 0 && <span className="text-xs text-on-surface-variant">{claimed} of {checklist.length} covered</span>}
          </div>
          {checklist.length > 0 && (
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-surface-container-high">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(claimed / checklist.length) * 100}%` }} />
            </div>
          )}
          {checklist.length === 0 ? (
            <p className="py-2 text-sm text-on-surface-variant">{canEditList ? 'Add what the crew needs: ice, chairs, cups…' : 'No supplies listed yet.'}</p>
          ) : (
            <ul className="space-y-2">
              {checklist.map((it, i) => (
                <li key={`${it.item}-${i}`} className="flex items-center gap-3 rounded-xl bg-surface-container-high p-2.5">
                  <button
                    aria-label={it.completed ? 'Mark not done' : 'Mark done'}
                    disabled={!canEditList}
                    onClick={() => updateItem(i, { completed: !it.completed })}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${it.completed ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-outline'}`}
                  >
                    {it.completed && <Check className="h-4 w-4" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate font-semibold ${it.completed ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}>{it.item}</p>
                    {it.assigned_to && <p className="text-xs text-on-surface-variant">Claimed by {it.assigned_to}{it.assigned_to === myName ? ' (you)' : ''}</p>}
                  </div>
                  {canEditList && !it.assigned_to && !it.completed && (
                    <button onClick={() => updateItem(i, { assigned_to: myName })}
                      className="shrink-0 rounded-lg bg-brand/15 px-2.5 py-1.5 text-xs font-bold text-orange-700 dark:text-brand-soft">
                      I'll bring this
                    </button>
                  )}
                  {canEditList && it.assigned_to === myName && !it.completed && (
                    <button onClick={() => updateItem(i, { assigned_to: '' })} className="shrink-0 text-xs font-semibold text-on-surface-variant">Unclaim</button>
                  )}
                  {isHost && (
                    <button aria-label="Remove item" onClick={() => saveChecklist.mutate(checklist.filter((_, j) => j !== i))} className="p-1 text-on-surface-variant hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {canEditList && (
            <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); addItem(); }}>
              <input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Add an item (e.g. 2 bags of ice)" className="gd-input h-11 flex-1" aria-label="New checklist item" />
              <button type="submit" disabled={!newItem.trim() || saveChecklist.isPending} aria-label="Add item"
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-container-highest text-on-surface disabled:opacity-50">
                <Plus className="h-5 w-5" />
              </button>
            </form>
          )}
        </section>

        {/* Crew chat (cloud accounts only) */}
        {serverRsvp && <CrewChat tailgateId={tailgateId} isCrew={isCrew} isHost={isHost} />}
      </main>

      <LoginPrompt open={showLoginPrompt} onOpenChange={setShowLoginPrompt} feature="RSVPs" onSuccess={setUser} />
      <SafetyButton />
    </div>
  );
}
