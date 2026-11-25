import React from 'react';
import { Tv, MapPin, ChevronRight, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GameStatusPill } from '@/components/scores/ScoreCard';

function TeamLine({ game, side, onTeamClick }) {
  const started = game.status !== 'upcoming';
  const score = game[`${side}_score`];
  const other = game[side === 'home' ? 'away_score' : 'home_score'];
  const won = game.status === 'final' && score > other;
  const lost = game.status === 'final' && score < other;
  const name = game[`${side}_team`];
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onTeamClick?.({ id: game[`${side}_team_id`], name })}
        className="-m-1 flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1 text-left transition-colors hover:bg-surface-container-high dark:hover:bg-surface"
        aria-label={`${name} team details`}
      >
        {game[`${side}_logo`] ? (
          <img src={game[`${side}_logo`]} alt="" loading="lazy" className="h-8 w-8 shrink-0 object-contain" />
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-[10px] font-bold text-on-surface-variant">
            {game[`${side}_abbrev`] || '?'}
          </span>
        )}
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            {game[`${side}_rank`] && (
              <span className="shrink-0 font-display text-sm font-bold text-orange-600 dark:text-brand-soft">#{game[`${side}_rank`]}</span>
            )}
            <span className={cn('truncate font-display text-lg font-bold leading-tight', lost ? 'text-on-surface-variant' : 'text-on-surface')}>
              {game[`${side}_short`] || name}
            </span>
            {won && <span className="shrink-0 text-xs font-bold text-emerald-600 dark:text-brand-win" aria-label="Winner">◀</span>}
          </span>
          {game[`${side}_record`] && (
            <span className="block text-xs text-on-surface-variant tabular-nums">{game[`${side}_record`]}</span>
          )}
        </span>
      </button>
      {started && (
        <span className={cn('gd-score min-w-[2ch] text-right text-2xl', lost ? 'text-on-surface-variant' : 'text-on-surface')}>{score}</span>
      )}
    </div>
  );
}

/** Schedule list card: status, teams (tap for team details), venue/line, game-center link. */
export default function ScheduleGameCard({ game, onTeamClick, onOpenGame }) {
  const isTBD = game.home_team === 'TBD' && game.away_team === 'TBD';
  const eventName = game.headline || (game.name && !game.name.includes(' at ') && !game.name.includes(' vs ') ? game.name : null);

  if (isTBD) {
    return (
      <div className="gd-card gd-card-glow p-4">
        <p className="gd-eyebrow flex items-center gap-1.5">
          <Trophy className="h-3.5 w-3.5" />
          {game.name?.includes('Championship') ? 'National Championship' : 'College Football Playoff'}
        </p>
        <p className="mt-1 font-display text-xl font-bold uppercase leading-tight text-on-surface">{game.name || 'College Football Playoff'}</p>
        <p className="mt-1 text-sm text-on-surface-variant">
          {game.game_date} · {game.game_time}{game.tv_network ? ` · ${game.tv_network}` : ''}
        </p>
        {game.venue && game.venue !== 'TBD' && (
          <p className="mt-1 flex items-center gap-1 text-xs text-on-surface-variant"><MapPin className="h-3 w-3" />{game.venue}</p>
        )}
        <p className="mt-3 border-t border-outline-variant/60 pt-2.5 text-xs font-semibold text-amber-600 dark:border-white/[0.06] dark:text-brand-highlight">
          Teams determined by earlier playoff rounds
        </p>
      </div>
    );
  }

  return (
    <div className={cn('gd-card p-3.5', game.status === 'live' && 'gd-card-glow')}>
      <div className="mb-3 flex items-center gap-2 text-xs">
        <GameStatusPill game={game} />
        {game.status === 'live' && game.down_distance && (
          <span className="truncate font-semibold text-on-surface">{game.down_distance}</span>
        )}
        {eventName && game.status !== 'live' && (
          <span className="truncate font-bold uppercase tracking-wide text-amber-600 dark:text-brand-highlight">{eventName}</span>
        )}
        {game.tv_network && (
          <span className="ml-auto flex shrink-0 items-center gap-1 rounded-md bg-surface-container-high px-1.5 py-0.5 font-bold text-on-surface-variant">
            <Tv className="h-3 w-3" />
            {game.tv_network}
          </span>
        )}
      </div>

      <div className="space-y-2.5">
        <TeamLine game={game} side="away" onTeamClick={onTeamClick} />
        <TeamLine game={game} side="home" onTeamClick={onTeamClick} />
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-outline-variant/60 pt-2.5 text-xs dark:border-white/[0.06]">
        <span className="min-w-0 flex-1 space-y-0.5">
          {game.venue && game.venue !== 'TBD' && (
            <span className="flex items-center gap-1 truncate text-on-surface-variant">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{game.venue}</span>
            </span>
          )}
          {game.status === 'upcoming' && (game.odds || game.over_under) && (
            <span className="flex items-center gap-2">
              {game.odds && <span className="rounded-full bg-brand/15 px-2 py-0.5 font-bold text-orange-700 dark:text-brand-soft">{game.odds}</span>}
              {game.over_under && <span className="text-on-surface-variant">O/U {game.over_under}</span>}
            </span>
          )}
        </span>
        {onOpenGame && (
          <button
            type="button"
            onClick={() => onOpenGame(game)}
            className="flex h-8 shrink-0 items-center gap-0.5 rounded-lg bg-surface-container-high px-2.5 font-bold uppercase tracking-wide text-on-surface dark:bg-surface"
            aria-label={`Game center: ${game.away_team} at ${game.home_team}`}
          >
            Game center
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
