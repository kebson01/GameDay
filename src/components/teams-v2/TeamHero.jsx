import React from 'react';
import { Star, Check, Share2, Users, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import TeamLogo from './TeamLogo';

/**
 * Team-colored hero: ESPN logo, AP rank, conference, record and standing,
 * plus Follow / Share actions.
 */
export default function TeamHero({
  name,
  mascot,
  logo,
  abbr,
  color,
  altColor,
  rank,
  conference,
  record,
  conferenceRecord,
  standing,
  streak,
  followers,
  stadium,
  isFollowing,
  onToggleFollow,
  followBusy,
  onShare,
}) {
  const base = color || '#f97316';
  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-outline-variant text-white shadow-[0_12px_24px_-8px_rgba(15,23,42,0.35)] dark:border-white/[0.08]"
      style={{ background: `linear-gradient(135deg, ${base} 0%, ${base} 45%, ${altColor && altColor.toLowerCase() !== '#ffffff' && altColor.toLowerCase() !== '#000000' ? altColor : base} 140%)` }}
      aria-label={`${name} team summary`}
    >
      {/* legibility scrim + floodlight */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/25 via-black/45 to-black/75" />
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />

      <div className="relative p-4">
        <div className="flex items-start gap-3.5">
          <TeamLogo
            src={logo}
            abbr={abbr}
            tile={false}
            className="h-20 w-20 rounded-2xl bg-white/95 shadow-lg ring-1 ring-black/10"
          />
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {rank && <span className="gd-pill bg-brand text-white">#{rank} AP</span>}
              {conference && <span className="gd-pill bg-white/15 text-white ring-1 ring-white/20">{conference}</span>}
              {streak && (
                <span className={cn('gd-pill ring-1 ring-white/20', streak.startsWith('W') ? 'bg-emerald-500/40 text-white' : 'bg-red-500/40 text-white')}>
                  {streak}
                </span>
              )}
            </div>
            <h2 className="mt-1.5 font-display text-[28px] font-extrabold uppercase leading-[0.95] tracking-tight drop-shadow line-clamp-2">
              {name}
            </h2>
            {mascot && <p className="text-sm font-medium text-white/80">{mascot}</p>}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-black/30 px-3 py-2 ring-1 ring-white/10 backdrop-blur-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">Record</p>
            <p className="gd-score text-2xl leading-tight">
              {record || '—'}
              {conferenceRecord && <span className="ml-1.5 font-sans text-xs font-semibold text-white/75">({conferenceRecord} conf)</span>}
            </p>
          </div>
          <div className="rounded-xl bg-black/30 px-3 py-2 ring-1 ring-white/10 backdrop-blur-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">Standing</p>
            <p className="truncate font-display text-lg font-bold uppercase leading-snug">{standing || conference || '—'}</p>
          </div>
        </div>

        {(stadium || followers > 0) && (
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/80">
            {stadium && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{stadium}</span>}
            {followers > 0 && <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{followers} following on GameDay</span>}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onToggleFollow}
            disabled={followBusy}
            aria-pressed={isFollowing}
            className={cn(
              'flex h-11 flex-1 items-center justify-center gap-2 rounded-xl font-display text-base font-bold uppercase tracking-wide transition-colors disabled:opacity-60',
              isFollowing ? 'bg-black/35 text-white ring-1 ring-white/40 backdrop-blur-sm' : 'bg-white text-[#0f172a] shadow-lg hover:bg-white/90'
            )}
          >
            {isFollowing ? <Check className="h-4 w-4" /> : <Star className="h-4 w-4" />}
            {isFollowing ? 'Following' : 'Follow'}
          </button>
          {onShare && (
            <button
              type="button"
              onClick={onShare}
              aria-label={`Share ${name}`}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 backdrop-blur-sm hover:bg-white/25"
            >
              <Share2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
