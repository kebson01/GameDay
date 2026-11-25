import React from 'react';
import { Plus, Check, Users, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import TeamLogo from './TeamLogo';

/** Discover list card: color stripe, logo, rank, conference, record, win % and Follow */
export default function DiscoverTeamCard({ team, rank, isFollowing, onToggleFollow, busy, onOpen }) {
  const s = team.stats;
  const pct = s && s.wins + s.losses > 0 ? Math.round(s.win_percentage * 1000) / 10 : null;
  const color = team.color || '#f97316';
  const alt = team.alt_color && !['#ffffff', '#000000'].includes(team.alt_color.toLowerCase()) ? team.alt_color : color;
  return (
    <article
      className={cn(
        'gd-card overflow-hidden',
        isFollowing && 'border-brand/60 gd-card-glow dark:border-brand/50'
      )}
    >
      <div className="flex h-1.5" aria-hidden="true">
        <span className="flex-[3]" style={{ background: color }} />
        <span className="flex-[2]" style={{ background: alt }} />
      </div>
      <div className="p-3.5">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`Open ${team.name}`}>
            <TeamLogo src={team.logo} abbr={team.abbreviation} className="h-14 w-14" />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-1.5">
                {rank && <span className="rounded bg-brand/15 px-1.5 text-[11px] font-bold text-orange-600 dark:text-brand-soft">#{rank}</span>}
                {team.conference && (
                  <span className="rounded border border-outline-variant px-1.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant dark:border-white/[0.1]">
                    {team.conference}
                  </span>
                )}
              </span>
              <span
                className={cn(
                  'mt-0.5 block truncate font-display text-xl font-bold uppercase leading-tight',
                  isFollowing ? 'text-orange-600 dark:text-brand-soft' : 'text-on-surface'
                )}
              >
                {team.name}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={onToggleFollow}
            disabled={busy}
            aria-pressed={isFollowing}
            aria-label={isFollowing ? `Unfollow ${team.name}` : `Follow ${team.name}`}
            className={cn(
              'flex h-10 shrink-0 items-center gap-1 rounded-xl px-3 font-display text-sm font-bold uppercase tracking-wide transition-colors disabled:opacity-60',
              isFollowing
                ? 'bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/40 dark:text-brand-win'
                : 'gd-btn-primary'
            )}
          >
            {isFollowing ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="mt-3 flex w-full items-center gap-3 rounded-xl bg-surface-container-high/70 px-3 py-2 text-left dark:bg-surface"
          aria-label={`${team.name} details`}
        >
          <span className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">Record</span>
            <span className="gd-score text-lg text-on-surface">{s?.overall_record || '—'}</span>
            {s?.conference_record && <span className="ml-1 text-xs text-on-surface-variant">({s.conference_record} conf)</span>}
          </span>
          <span className="h-8 w-px bg-outline-variant dark:bg-white/[0.08]" aria-hidden="true" />
          <span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">Win %</span>
            <span className={cn('gd-score text-lg', pct >= 75 ? 'text-emerald-600 dark:text-brand-win' : 'text-on-surface')}>
              {pct != null ? `${pct}%` : '—'}
            </span>
          </span>
          {s?.streak && (
            <>
              <span className="h-8 w-px bg-outline-variant dark:bg-white/[0.08]" aria-hidden="true" />
              <span>
                <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">Streak</span>
                <span className="gd-score text-lg text-on-surface">{s.streak}</span>
              </span>
            </>
          )}
          <span className="ml-auto flex items-center gap-1 text-xs text-on-surface-variant">
            {team.follower_count > 0 && (
              <span className="flex items-center gap-1" title="GameDay followers">
                <Users className="h-3.5 w-3.5" />{team.follower_count}
              </span>
            )}
            <ChevronRight className="h-4 w-4" />
          </span>
        </button>
      </div>
    </article>
  );
}
