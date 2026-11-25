import React from 'react';
import { cn } from '@/lib/utils';

function StreakPill({ streak }) {
  if (!streak || streak === '-' ) return <span className="text-on-surface-variant">–</span>;
  const win = /^W/i.test(streak);
  const loss = /^L/i.test(streak);
  return (
    <span
      className={cn(
        'inline-flex min-w-[30px] justify-center rounded-md px-1 py-0.5 font-display text-sm font-bold uppercase',
        win && 'bg-emerald-500/15 text-emerald-700 dark:text-brand-win',
        loss && 'bg-red-500/15 text-red-700',
        !win && !loss && 'bg-surface-container-high text-on-surface-variant'
      )}
    >
      {streak}
    </span>
  );
}

const COLS = 'grid grid-cols-[18px_minmax(0,1fr)_34px_38px_36px_34px] items-center gap-x-1.5';

/** One conference's standings as a scoreboard-style table card. */
export default function StandingsTable({ conference, teams, apRanks = {}, mode = 'conf', highlightIds = [] }) {
  return (
    <section className="gd-card overflow-hidden" aria-label={`${conference} standings`}>
      <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-3.5">
        <h2 className="truncate font-display text-xl font-bold uppercase tracking-wide text-on-surface">{conference}</h2>
        <span className="shrink-0 text-xs font-semibold text-on-surface-variant">{teams.length} teams</span>
      </div>
      <div role="table" aria-label={`${conference} standings`} className="text-sm">
        <div
          role="row"
          className={cn(
            COLS,
            'border-y border-outline-variant/70 bg-surface-container-high/60 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:border-white/[0.06] dark:bg-surface/60'
          )}
        >
          <span role="columnheader" className="text-center">#</span>
          <span role="columnheader">Team</span>
          <span role="columnheader" className={cn('text-center', mode === 'conf' && 'text-orange-600 dark:text-brand-soft')}>Conf</span>
          <span role="columnheader" className={cn('text-center', mode === 'overall' && 'text-orange-600 dark:text-brand-soft')}>Ovr</span>
          <span role="columnheader" className="text-center">Pct</span>
          <span role="columnheader" className="text-center">Strk</span>
        </div>
        {teams.map((team, idx) => {
          const ap = apRanks[team.team_id];
          const mine = highlightIds.includes(team.team_id);
          return (
            <div
              role="row"
              key={team.team_id || idx}
              className={cn(
                COLS,
                'relative border-b border-outline-variant/50 px-3 py-2.5 last:border-b-0 dark:border-white/[0.05]',
                mine && 'bg-brand/10'
              )}
            >
              {mine && <span className="absolute inset-y-0 left-0 w-1 bg-brand" aria-hidden="true" />}
              <span role="cell" className="text-center font-display text-base font-bold text-on-surface-variant">{idx + 1}</span>
              <span role="cell" className="flex min-w-0 items-center gap-2">
                {team.logo ? (
                  <img src={team.logo} alt="" loading="lazy" className="h-6 w-6 shrink-0 object-contain" />
                ) : (
                  <span className="h-6 w-6 shrink-0 rounded-full bg-surface-container-high" />
                )}
                <span className="line-clamp-2 min-w-0 break-words text-[13px] font-semibold leading-tight text-on-surface">
                  {ap && <span className="mr-1 font-display font-bold text-orange-600 dark:text-brand-soft">#{ap}</span>}
                  {team.team_name}
                </span>
              </span>
              <span role="cell" className={cn('text-center font-display text-base font-bold tabular-nums', mode === 'conf' ? 'text-on-surface' : 'text-on-surface-variant')}>
                {team.conference_wins}-{team.conference_losses}
              </span>
              <span role="cell" className={cn('text-center font-display text-base font-bold tabular-nums', mode === 'overall' ? 'text-on-surface' : 'text-on-surface-variant')}>
                {team.wins}-{team.losses}
              </span>
              <span role="cell" className="text-center text-xs font-semibold tabular-nums text-on-surface-variant">
                {(team.win_percentage || 0).toFixed(3).replace(/^0/, '')}
              </span>
              <span role="cell" className="text-center"><StreakPill streak={team.streak} /></span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
