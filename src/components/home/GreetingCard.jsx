import React, { useEffect, useState } from 'react';
import { MapPin, Wind } from 'lucide-react';
import { fetchWeather, getPosition, locationAlreadyAllowed } from '@/lib/weather';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * "Hey Sarah" greeting with real local weather (Open-Meteo). Weather loads
 * automatically only if location is already allowed; otherwise a tap asks.
 */
export default function GreetingCard({ user, nextGame }) {
  const [weather, setWeather] = useState(null);
  const [state, setState] = useState('idle'); // idle | loading | ready | error | ask

  const load = async () => {
    setState('loading');
    try {
      setWeather(await fetchWeather(await getPosition()));
      setState('ready');
    } catch {
      setState('error');
    }
  };

  useEffect(() => {
    locationAlreadyAllowed().then(ok => (ok ? load() : setState('ask')));
  }, []);

  const first = user?.full_name?.split(' ')[0];
  const kickoff = nextGame?.status === 'upcoming' && nextGame.full_date ? new Date(nextGame.full_date) : null;
  const daysAway = kickoff ? Math.round((new Date(kickoff.toDateString()) - new Date(new Date().toDateString())) / 86400000) : null;
  const when = daysAway === 0 ? 'today' : daysAway === 1 ? 'tomorrow' : daysAway != null ? `in ${daysAway} days` : null;

  return (
    <section className="gd-card relative overflow-hidden p-4">
      <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-brand/15 blur-3xl" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="gd-eyebrow">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
          <h2 className="mt-0.5 font-display text-[28px] font-extrabold uppercase leading-none text-on-surface">
            {first ? `${greeting()}, ${first}` : `${greeting()}!`}
          </h2>
          <p className="mt-1.5 text-sm text-on-surface-variant">
            {nextGame && when
              ? <>Your next game is <b className="text-on-surface">{when}</b>: {nextGame.away_short || nextGame.away_team} at {nextGame.home_short || nextGame.home_team}.</>
              : nextGame?.status === 'live'
                ? <>🔴 <b className="text-on-surface">{nextGame.away_short} vs {nextGame.home_short}</b> is live now.</>
                : 'Scores, tailgates and your crew, all in one place.'}
          </p>
        </div>

        <div className="shrink-0 text-right">
          {state === 'ready' && weather ? (
            <div className="rounded-xl bg-surface-container-high px-3 py-2 dark:bg-surface">
              <p className="font-display text-3xl font-extrabold leading-none text-on-surface">{weather.emoji} {weather.temp}°</p>
              <p className="mt-0.5 text-xs font-semibold text-on-surface">{weather.label}</p>
              <p className="flex items-center justify-end gap-1 text-[11px] text-on-surface-variant">
                <Wind className="h-3 w-3" />{weather.wind} mph{weather.rain != null ? ` · ${weather.rain}% rain` : ''}
              </p>
            </div>
          ) : state === 'loading' ? (
            <div className="h-16 w-24 animate-pulse rounded-xl bg-surface-container-high" />
          ) : (
            <button
              type="button"
              onClick={load}
              className="flex items-center gap-1.5 rounded-xl bg-surface-container-high px-3 py-2 text-xs font-semibold text-on-surface dark:bg-surface"
            >
              <MapPin className="h-3.5 w-3.5 text-orange-500" />{state === 'error' ? 'Weather unavailable' : 'Tap for weather'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
