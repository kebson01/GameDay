import React, { useEffect, useState } from 'react';
import { Tv, ChevronRight, MapPin } from 'lucide-react';
import { GameStatusPill, WinProbabilityBar } from './ScoreCard';

function useCountdown(iso) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!iso) return null;
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

function Side({ game, side, align }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${align === 'right' ? 'items-end text-right' : 'items-start'}`}>
      {game[`${side}_logo`] ? (
        <img src={game[`${side}_logo`]} alt="" className="h-12 w-12 object-contain drop-shadow" />
      ) : (
        <span className="h-12 w-12 rounded-full bg-surface-container-high" />
      )}
      <div className={`flex items-center gap-1.5 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        {game[`${side}_rank`] && <span className="rounded bg-surface-container-high px-1 text-[11px] font-bold text-orange-600 dark:text-brand-soft">#{game[`${side}_rank`]}</span>}
        <span className="text-xs text-on-surface-variant tabular-nums">{game[`${side}_record`]}</span>
      </div>
      <span className="max-w-full font-display text-xl font-bold uppercase leading-[1.05] text-on-surface line-clamp-2">
        {game[`${side}_short`] || game[`${side}_team`]}
      </span>
    </div>
  );
}

/** Marquee card: the biggest live game, or the next big kickoff */
export default function FeaturedGame({ game, onOpen }) {
  const countdown = useCountdown(game.status === 'upcoming' ? game.full_date : null);
  const showScore = game.status !== 'upcoming';
  return (
    <button
      type="button"
      onClick={() => onOpen(game)}
      className="gd-card gd-card-glow relative block w-full overflow-hidden p-4 text-left"
      aria-label={`Featured game: ${game.away_team} at ${game.home_team}`}
    >
      {/* stadium floodlight glow */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-brand/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-amber-400/10 blur-2xl" />

      <div className="relative">
        <div className="mb-3 flex items-center gap-2">
          <span className="shrink-0 whitespace-nowrap"><GameStatusPill game={game} /></span>
          <span className="flex min-w-0 items-center gap-1 truncate text-xs text-on-surface-variant">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{game.venue}</span>
          </span>
          {game.tv_network && (
            <span className="ml-auto flex shrink-0 items-center gap-1 rounded-md bg-surface-container-high px-1.5 py-0.5 text-xs font-bold text-on-surface">
              <Tv className="h-3 w-3 text-amber-500" />
              {game.tv_network}
            </span>
          )}
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <Side game={game} side="away" align="left" />
          <div className="flex flex-col items-center px-1">
            {showScore ? (
              <div className="gd-score flex items-baseline gap-1.5 text-5xl text-on-surface">
                <span className={game.status === 'final' && game.away_score < game.home_score ? 'text-slate-400' : ''}>{game.away_score}</span>
                <span className="text-2xl text-slate-400">–</span>
                <span className={game.status === 'final' && game.home_score < game.away_score ? 'text-slate-400' : ''}>{game.home_score}</span>
              </div>
            ) : (
              <span className="font-display text-4xl font-extrabold text-slate-300 dark:text-slate-400">VS</span>
            )}
            {game.status === 'live' && game.down_distance && (
              <span className="mt-1 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">{game.down_distance}</span>
            )}
          </div>
          <Side game={game} side="home" align="right" />
        </div>

        {game.status === 'live' && game.possession_text && (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-orange-600 dark:text-brand-soft">
            <span className="animate-bounce">🏈</span> Ball on {game.possession_text}
          </p>
        )}

        {countdown && (
          <div className="mt-4 rounded-xl bg-surface-container-high/70 p-3 dark:bg-surface">
            <p className="mb-1 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">Kickoff in</p>
            <div className="flex items-end justify-center gap-3 font-display font-extrabold tabular-nums text-on-surface">
              {countdown.d > 0 && <span className="text-center"><span className="block text-3xl leading-none">{countdown.d}</span><span className="text-[10px] font-semibold uppercase text-on-surface-variant">days</span></span>}
              <span className="text-center"><span className="block text-3xl leading-none">{String(countdown.h).padStart(2, '0')}</span><span className="text-[10px] font-semibold uppercase text-on-surface-variant">hrs</span></span>
              <span className="pb-3 text-2xl text-slate-400">:</span>
              <span className="text-center"><span className="block text-3xl leading-none">{String(countdown.m).padStart(2, '0')}</span><span className="text-[10px] font-semibold uppercase text-on-surface-variant">min</span></span>
              <span className="pb-3 text-2xl text-slate-400">:</span>
              <span className="text-center"><span className="block text-3xl leading-none text-orange-600 dark:text-brand-soft">{String(countdown.s).padStart(2, '0')}</span><span className="text-[10px] font-semibold uppercase text-on-surface-variant">sec</span></span>
            </div>
            {(game.odds || game.over_under) && (
              <p className="mt-2 text-center text-xs text-on-surface-variant">
                {game.odds && <>Spread: <b className="text-on-surface">{game.odds}</b></>}
                {game.odds && game.over_under && ' · '}
                {game.over_under && <>O/U <b className="text-on-surface">{game.over_under}</b></>}
              </p>
            )}
          </div>
        )}

        {game.status === 'live' && game.home_win_pct != null && (
          <div className="mt-4"><WinProbabilityBar game={game} /></div>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-outline-variant/60 pt-3 text-sm font-semibold text-orange-600 dark:border-white/[0.06] dark:text-brand-soft">
          <span>{game.status === 'upcoming' ? 'Matchup preview' : 'Gamecast, stats & play-by-play'}</span>
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
    </button>
  );
}
