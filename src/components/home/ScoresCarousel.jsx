import React from 'react';
import { cn } from '@/lib/utils';

function statusLine(game) {
  if (game.status === 'live') {
    return { left: game.quarter || 'Live', right: game.time_remaining || '', live: true };
  }
  if (game.status === 'final') return { left: 'Final', right: game.tv_network || '' };
  return { left: game.game_date, right: game.game_time };
}

function TeamLine({ logo, abbrev, rank, record, score, showScore, winning }) {
  return (
    <div className="flex items-center gap-2.5">
      {logo ? (
        <img src={logo} alt="" className="h-7 w-7 object-contain" loading="lazy" />
      ) : (
        <span className="h-7 w-7 rounded-full bg-slate-200" />
      )}
      <span className="font-display text-xl font-bold leading-none text-slate-900">
        {rank ? <span className="mr-1 align-top text-xs font-semibold text-slate-500">{rank}</span> : null}
        {abbrev}
      </span>
      <span
        className={cn(
          'ml-auto font-display text-xl font-bold tabular-nums leading-none',
          showScore ? (winning ? 'text-slate-900' : 'text-slate-400') : 'text-slate-500 text-base'
        )}
      >
        {showScore ? score : record || ''}
      </span>
    </div>
  );
}

/** Swipeable score cards (today / this week). Tapping a card opens the game. */
export default function ScoresCarousel({ games = [], onOpen }) {
  if (!games.length) return null;
  return (
    <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="list">
      {games.map(game => {
        const st = statusLine(game);
        const showScore = game.status !== 'upcoming';
        return (
          <button
            key={game.id}
            type="button"
            role="listitem"
            onClick={() => onOpen(game)}
            className="w-52 shrink-0 snap-start rounded-2xl border border-outline-variant bg-surface-container p-3.5 text-left shadow-sm"
            aria-label={`${game.away_team} at ${game.home_team}`}
          >
            <div className="mb-3 flex items-center justify-between text-xs font-semibold">
              <span className={cn('flex items-center gap-1.5', st.live ? 'text-red-500' : 'text-slate-600')}>
                {st.live && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />}
                {st.left}
              </span>
              <span className="text-slate-500">{st.right}</span>
            </div>
            <div className="space-y-2.5">
              <TeamLine logo={game.away_logo} abbrev={game.away_abbrev} rank={game.away_rank} record={game.away_record}
                score={game.away_score} showScore={showScore} winning={game.away_score >= game.home_score} />
              <TeamLine logo={game.home_logo} abbrev={game.home_abbrev} rank={game.home_rank} record={game.home_record}
                score={game.home_score} showScore={showScore} winning={game.home_score >= game.away_score} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
