import React from 'react';
import { Tv, Star, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

// Status pill for a game: RED ZONE / HALFTIME / LIVE Q3 4:18 / FINAL / kickoff time
export function GameStatusPill({ game }) {
  if (game.status === 'live') {
    if (game.is_red_zone) {
      return <span className="gd-pill bg-red-600 text-white"><span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />Red Zone</span>;
    }
    if (game.is_halftime) return <span className="gd-pill bg-amber-500 text-ink-900">Halftime</span>;
    return (
      <span className="gd-pill bg-red-600/15 text-red-600 dark:bg-red-500/20 dark:text-red-300">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
        {game.status_short || `Live ${game.quarter || ''}`}
      </span>
    );
  }
  if (game.status === 'final') return <span className="gd-pill bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-700">{game.status_short || 'Final'}</span>;
  return <span className="gd-pill bg-surface-container-high text-on-surface">{game.game_time}</span>;
}

function TeamRow({ game, side }) {
  const live = game.status !== 'upcoming';
  const score = game[`${side}_score`];
  const other = game[side === 'home' ? 'away_score' : 'home_score'];
  const won = game.status === 'final' && score > other;
  const lost = game.status === 'final' && score < other;
  const hasBall = game.status === 'live' && game.possession_team_id && game.possession_team_id === game[`${side}_team_id`];
  return (
    <div className="flex items-center gap-2.5">
      {game[`${side}_logo`] ? (
        <img src={game[`${side}_logo`]} alt="" className="h-7 w-7 object-contain" loading="lazy" />
      ) : (
        <span className="h-7 w-7 rounded-full bg-surface-container-high" />
      )}
      {game[`${side}_rank`] && (
        <span className="rounded bg-surface-container-high px-1 text-[11px] font-bold text-orange-600 dark:text-brand-soft">
          #{game[`${side}_rank`]}
        </span>
      )}
      <span className={cn('min-w-0 truncate font-display text-xl font-bold leading-none', lost ? 'text-slate-400' : 'text-on-surface')}>
        {game[`${side}_short`] || game[`${side}_team`]}
      </span>
      {hasBall && <span className="text-sm" aria-label="Has the ball">🏈</span>}
      {won && <span className="text-xs font-bold text-emerald-600 dark:text-brand-win">◀</span>}
      <span className="ml-auto flex items-baseline gap-2">
        {!live && game[`${side}_record`] && <span className="text-xs text-on-surface-variant tabular-nums">{game[`${side}_record`]}</span>}
        {live && (
          <span className={cn('gd-score text-2xl', lost ? 'text-slate-400' : won || score > other ? 'text-on-surface' : 'text-on-surface')}>
            {score}
          </span>
        )}
      </span>
    </div>
  );
}

/** Compact scoreboard card used in lists */
export default function ScoreCard({ game, favorite, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(game)}
      className={cn('gd-card block w-full p-3.5 text-left', game.status === 'live' && 'gd-card-glow')}
      aria-label={`${game.away_team} at ${game.home_team}`}
    >
      <div className="mb-3 flex items-center gap-2 text-xs">
        <GameStatusPill game={game} />
        {game.status === 'live' && game.down_distance && (
          <span className="truncate font-semibold text-on-surface">{game.down_distance}</span>
        )}
        {game.status !== 'live' && (game.headline || game.venue) && (
          <span className="flex min-w-0 items-center gap-1 truncate text-on-surface-variant">
            {!game.headline && <MapPin className="h-3 w-3 shrink-0" />}
            <span className="truncate">{game.headline || game.venue}</span>
          </span>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          {favorite && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-label="Your team" />}
          {game.tv_network && (
            <span className="flex items-center gap-1 rounded-md bg-surface-container-high px-1.5 py-0.5 font-bold text-on-surface-variant">
              <Tv className="h-3 w-3" />
              {game.tv_network}
            </span>
          )}
        </span>
      </div>
      <div className="space-y-2.5">
        <TeamRow game={game} side="away" />
        <TeamRow game={game} side="home" />
      </div>
      {game.status === 'upcoming' && (game.odds || game.over_under) && (
        <div className="mt-3 flex items-center gap-2 border-t border-outline-variant/60 pt-2.5 text-xs dark:border-white/[0.06]">
          {game.odds && <span className="rounded-full bg-brand/15 px-2 py-0.5 font-bold text-orange-700 dark:text-brand-soft">{game.odds}</span>}
          {game.over_under && <span className="text-on-surface-variant">O/U {game.over_under}</span>}
        </div>
      )}
      {game.status === 'live' && game.home_win_pct != null && <WinProbabilityBar game={game} compact />}
    </button>
  );
}

/** Horizontal win-probability bar (ESPN live model) */
export function WinProbabilityBar({ game, compact = false }) {
  const home = game.home_win_pct;
  if (home == null) return null;
  const away = Math.round((100 - home) * 10) / 10;
  return (
    <div className={cn('rounded-xl bg-surface-container-high/70 dark:bg-surface', compact ? 'mt-3 p-2' : 'p-3')}>
      <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
        <span className="text-on-surface">{game.away_abbrev} {away}%</span>
        <span className="text-on-surface-variant">Win probability</span>
        <span className="text-on-surface">{game.home_abbrev} {home}%</span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-surface-container-highest">
        <div style={{ width: `${away}%`, background: game.away_color || '#64748b' }} />
        <div style={{ width: `${home}%`, background: game.home_color || '#f97316' }} />
      </div>
    </div>
  );
}
