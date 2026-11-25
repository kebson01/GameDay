import React from 'react';
import { Clock, MapPin, Users, Lock, CheckCircle2, ArrowRight, KeyRound, Plus, Check } from 'lucide-react';
import { amenityInfo, distanceLabel, tailgateDayLabel, timeRange } from './tailgateUtils';

/** Directory card (Stitch): photo with badges, host, title, time, amenities, actions */
export default function TailgateListCard({ tailgate: t, userLocation, attending, isHost, onOpen, onRsvp, rsvpPending }) {
  const dist = distanceLabel(userLocation, t.location);
  const full = t.capacity && t.rsvp_count >= t.capacity;
  return (
    <article className="gd-card overflow-hidden">
      <button type="button" className="block w-full text-left" onClick={() => onOpen(t)} aria-label={`Open ${t.name}`}>
        <div className="relative h-44 w-full bg-gradient-to-br from-orange-500 via-red-500 to-ink-900">
          {t.photo_url ? (
            <img src={t.photo_url} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-6xl opacity-80">🔥</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/30" />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {t.is_public ? (
              <span className="gd-pill bg-emerald-600 text-white"><CheckCircle2 className="h-3 w-3" />Public RSVP</span>
            ) : (
              <span className="gd-pill bg-amber-400 text-ink-900"><Lock className="h-3 w-3" />Invite only</span>
            )}
            {attending && <span className="gd-pill bg-white/90 text-ink-900"><Check className="h-3 w-3" />Going</span>}
            {isHost && <span className="gd-pill bg-brand text-white">Your tailgate</span>}
          </div>
          {(t.location?.lot_name || dist) && (
            <span className="gd-pill absolute right-3 top-3 bg-black/65 text-white normal-case tracking-normal">
              <MapPin className="h-3 w-3" />
              {[t.location?.lot_name, dist].filter(Boolean).join(' · ')}
            </span>
          )}
          <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2 text-white">
            <span className="flex min-w-0 items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand font-display text-base font-bold ring-2 ring-white/70">
                {t.host_name?.charAt(0)?.toUpperCase() || '🏈'}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold leading-tight">{t.host_name || 'Host'}</span>
                <span className="block text-[11px] text-white/75">Tailgate host</span>
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-xs font-semibold">
              <Users className="h-3 w-3" />
              {t.rsvp_count || 0}{t.capacity ? `/${t.capacity}` : ''} going
            </span>
          </div>
        </div>
        <div className="px-4 pt-3">
          <h3 className="font-display text-[22px] font-bold uppercase leading-[1.1] text-on-surface">{t.name}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-on-surface-variant">
            <Clock className="h-3.5 w-3.5 text-orange-500" />
            {tailgateDayLabel(t)} · {timeRange(t)}
          </p>
          {t.amenities?.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {t.amenities.slice(0, 5).map(a => {
                const info = amenityInfo(a);
                return (
                  <span key={a} className="rounded-lg bg-surface-container-high px-2 py-1 text-xs font-medium text-on-surface">
                    {info.emoji} {info.label}
                  </span>
                );
              })}
              {t.amenities.length > 5 && <span className="px-1 py-1 text-xs text-on-surface-variant">+{t.amenities.length - 5}</span>}
            </div>
          )}
        </div>
      </button>
      <div className="flex gap-2 p-4 pt-3">
        <button type="button" onClick={() => onOpen(t)}
          className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-high font-semibold text-on-surface dark:border-white/[0.08]">
          View details <ArrowRight className="h-4 w-4" />
        </button>
        {!isHost && !attending && (
          t.is_public ? (
            <button type="button" onClick={() => onRsvp(t)} disabled={rsvpPending || full}
              className="gd-btn-primary flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl disabled:opacity-50">
              <Plus className="h-4 w-4" />{full ? 'Full' : 'RSVP'}
            </button>
          ) : (
            <button type="button" onClick={() => onOpen(t)}
              className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-amber-400/60 font-semibold text-amber-700 dark:text-brand-highlight">
              <KeyRound className="h-4 w-4" />Enter passcode
            </button>
          )
        )}
      </div>
    </article>
  );
}
