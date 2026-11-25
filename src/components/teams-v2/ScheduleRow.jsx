import React from 'react';
import { ChevronRight, Tv } from 'lucide-react';
import { cn } from '@/lib/utils';
import TeamLogo from './TeamLogo';

/**
 * One game from fetchTeamSchedule(): result badge, opponent, date/TV and
 * score (finals) or kickoff time (upcoming). Styled like the score cards.
 */
export default function ScheduleRow({ game, onOpen }) {
  const won = game.result?.won === true;
  const lost = game.result && !game.result.won;
  const live = game.status === 'live';
  return (
    <button
      type="button"
      onClick={() => onOpen?.(game)}
      className={cn('gd-card flex w-full items-center gap-3 p-3 text-left', live && 'gd-card-glow')}
      aria-label={`${game.is_home ? 'vs' : 'at'} ${game.opponent}, ${game.game_date}${game.result ? `, ${won ? 'won' : 'lost'} ${game.result.team_score} to ${game.result.opponent_score}` : ''}`}
    >
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl font-display font-bold uppercase leading-none',
          won && 'bg-emerald-500/15 text-lg text-emerald-600 dark:text-brand-win',
          lost && 'bg-red-500/15 text-lg text-red-600 dark:text-red-400',
          live && 'bg-red-600 text-[11px] text-white',
          !game.result && !live && 'bg-surface-container-high text-on-surface-variant dark:bg-white/[0.06]'
        )}
      >
        {won ? 'W' : lost ? 'L' : live ? 'Live' : (
          <>
            <span className="text-[9px] tracking-wider">Wk</span>
            <span className="text-base">{game.week}</span>
          </>
        )}
      </span>

      <TeamLogo src={game.opponent_logo} abbr={game.opponent_abbrev} className="h-9 w-9" tile={false} imgClassName="h-full w-full" />

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-1.5">
          <span className="shrink-0 text-xs font-semibold text-on-surface-variant">{game.is_home ? 'vs' : '@'}</span>
          {game.opponent_rank && (
            <span className="shrink-0 text-[11px] font-bold text-orange-600 dark:text-brand-soft">#{game.opponent_rank}</span>
          )}
          <span className="truncate font-display text-lg font-bold uppercase leading-tight text-on-surface">{game.opponent}</span>
        </span>
        <span className="flex items-center gap-1.5 truncate text-xs text-on-surface-variant">
          <span>{game.game_date}</span>
          {game.tv_network && !game.result && (
            <>
              <span aria-hidden="true">·</span>
              <Tv className="h-3 w-3 shrink-0" />
              <span className="truncate">{game.tv_network}</span>
            </>
          )}
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-1">
        {game.result ? (
          <span className={cn('gd-score text-xl', lost ? 'text-on-surface-variant' : 'text-on-surface')}>
            {game.result.team_score}-{game.result.opponent_score}
          </span>
        ) : live ? (
          <span className="text-xs font-bold uppercase text-red-600 dark:text-red-400">Gamecast</span>
        ) : (
          <span className="text-xs font-semibold text-on-surface">{game.time}</span>
        )}
        <ChevronRight className="h-4 w-4 text-on-surface-variant" />
      </span>
    </button>
  );
}
