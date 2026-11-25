import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, RefreshCw, Calendar, Heart, Star, X, PartyPopper, MapPin, ChevronRight } from 'lucide-react';
import { auth } from '@/lib/auth';
import { client } from '@/api/client';
import {
  fetchScoreboardWithMeta, fetchWeekByNumber, fetchGamesForCalendarEntry, fetchSeasonCalendar, getCurrentSeason,
} from '@/lib/sportsApi';
import { createPageUrl } from '@/utils';
import AppHeader from '@/components/layout/AppHeader';
import ScoreCard from '@/components/scores/ScoreCard';
import FeaturedGame from '@/components/scores/FeaturedGame';
import SafetyButton from '@/components/common/SafetyButton';
import { Skeleton } from '@/components/common/LoadingSkeleton';
import { toast } from 'sonner';

const localDateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const FILTERS = [
  { id: 'top25', label: 'Top 25', icon: Star },
  { id: 'SEC', label: 'SEC' },
  { id: 'Big Ten', label: 'Big Ten' },
  { id: 'ACC', label: 'ACC' },
  { id: 'Big 12', label: 'Big 12' },
  { id: 'mine', label: 'My Teams', icon: Heart },
];

export default function GameDay() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [scope, setScope] = useState('week'); // 'today' | 'week' | 'cfp'
  const [tab, setTab] = useState(null); // 'live' | 'upcoming' | 'final' (null = auto)
  const [filter, setFilter] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    auth.me().then(setUser).catch(() => {});
  }, []);
  const favoriteTeams = user?.favorite_teams || [];

  const { data: calendar = [] } = useQuery({
    queryKey: ['season-calendar', getCurrentSeason()],
    queryFn: () => fetchSeasonCalendar(getCurrentSeason()),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const hasCfp = calendar.some(e => e.label === 'CFP');

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['scores', scope, getCurrentSeason()],
    queryFn: async () => {
      if (scope === 'cfp') {
        const entry = calendar.find(e => e.label === 'CFP');
        const games = entry
          ? await fetchGamesForCalendarEntry(entry, getCurrentSeason())
          : (await fetchWeekByNumber(999, 3, getCurrentSeason())).games;
        return { games, week: null };
      }
      const { games, week } = await fetchScoreboardWithMeta();
      if (scope === 'today') {
        const today = localDateKey();
        const todays = games.filter(g => g.status === 'live' || (g.full_date && localDateKey(new Date(g.full_date)) === today));
        if (todays.length) return { games: todays, week, dayLabel: 'Today' };
        // No games today: show the next day that has games
        const next = games.filter(g => g.status === 'upcoming').sort((a, b) => new Date(a.full_date) - new Date(b.full_date))[0];
        if (!next) return { games: [], week, dayLabel: 'Today' };
        const key = localDateKey(new Date(next.full_date));
        return {
          games: games.filter(g => g.full_date && localDateKey(new Date(g.full_date)) === key),
          week,
          dayLabel: new Date(next.full_date).toLocaleDateString('en-US', { weekday: 'long' }),
        };
      }
      return { games, week };
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });
  const games = data?.games || [];

  const isFavorite = (g) =>
    favoriteTeams.some(t => [g.home_team, g.away_team].some(n => n?.toLowerCase() === t.toLowerCase() || n?.toLowerCase().includes(t.toLowerCase())));

  const filtered = useMemo(() => {
    let list = games;
    if (filter === 'top25') list = list.filter(g => g.home_rank || g.away_rank);
    else if (filter === 'mine') list = list.filter(isFavorite);
    else if (filter) list = list.filter(g => g.conference === filter);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(g => [g.home_team, g.away_team, g.home_abbrev, g.away_abbrev].some(n => n?.toLowerCase().includes(q)));
    }
    return list;
  }, [games, filter, searchQuery, favoriteTeams.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = {
    live: filtered.filter(g => g.status === 'live').length,
    upcoming: filtered.filter(g => g.status === 'upcoming').length,
    final: filtered.filter(g => g.status === 'final').length,
  };
  // Default tab: Live when games are on, else Upcoming, else Final
  const activeTab = tab || (counts.live ? 'live' : counts.upcoming ? 'upcoming' : 'final');

  // Ranking helper: favorites first, then best ranked matchup
  const importance = (g) => (isFavorite(g) ? -100 : 0) + Math.min(g.home_rank || 99, g.away_rank || 99) + (g.home_rank && g.away_rank ? -10 : 0);

  const tabGames = useMemo(() => {
    const list = filtered.filter(g => g.status === activeTab);
    if (activeTab === 'upcoming') return list.sort((a, b) => new Date(a.full_date) - new Date(b.full_date));
    if (activeTab === 'final') return list.sort((a, b) => new Date(b.full_date) - new Date(a.full_date));
    return list.sort((a, b) => importance(a) - importance(b));
  }, [filtered, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const featured = useMemo(() => {
    if (activeTab === 'final' || !tabGames.length) return null;
    return [...tabGames].sort((a, b) => importance(a) - importance(b))[0];
  }, [tabGames, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const listGames = tabGames.filter(g => g !== featured);
  const groups = useMemo(() => {
    if (activeTab === 'live') return [['', listGames]];
    const out = new Map();
    for (const g of listGames) {
      const key = g.full_date ? new Date(g.full_date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : 'Time TBD';
      if (!out.has(key)) out.set(key, []);
      out.get(key).push(g);
    }
    return [...out.entries()];
  }, [listGames, activeTab]);

  // Today's public tailgates ("Tailgate Radar")
  const { data: tailgates = [] } = useQuery({
    queryKey: ['today-tailgates', localDateKey()],
    queryFn: () => client.entities.Tailgate.filter({ game_date: localDateKey(), is_public: true }),
  });

  const openGame = (g) =>
    navigate(createPageUrl('LiveGame') + `?gameId=${g.id}&home=${encodeURIComponent(g.home_team)}&away=${encodeURIComponent(g.away_team)}`);

  const dates = games.map(g => g.full_date && new Date(g.full_date)).filter(Boolean).sort((a, b) => a - b);
  // "Nov 27–29", or "Nov 30 – Dec 2" across months
  const range = (() => {
    if (!dates.length) return '';
    const first = dates[0];
    const last = dates[dates.length - 1];
    const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (first.toDateString() === last.toDateString()) return fmt(first);
    if (first.getMonth() === last.getMonth()) return `${fmt(first)}–${last.getDate()}`;
    return `${fmt(first)} – ${fmt(last)}`;
  })();
  const contextLabel = scope === 'cfp' ? 'College Football Playoff' : scope === 'today' ? (data?.dayLabel || 'Today') : data?.week ? `Week ${data.week}` : 'This week';

  return (
    <div className="gd-page">
      <AppHeader
        eyebrow="Saturday Live"
        title="Live Scores"
        actions={
          <>
            <button
              type="button"
              aria-label={showSearch ? 'Close search' : 'Search teams'}
              onClick={() => { setShowSearch(v => !v); setSearchQuery(''); }}
              className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface"
            >
              {showSearch ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </button>
            <button
              type="button"
              aria-label="Refresh scores"
              onClick={() => { refetch(); toast.success('Refreshing scores…', { duration: 1200 }); }}
              className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface"
            >
              <RefreshCw className={`h-5 w-5 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </>
        }
      >
        {showSearch && (
          <input
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by team…"
            className="gd-input"
            aria-label="Search by team"
          />
        )}
      </AppHeader>

      <main className="space-y-4 px-4 pt-4">
        {/* Context + scope */}
        <div className="flex items-center justify-between gap-2">
          <p className="flex min-w-0 items-center gap-1.5 text-sm">
            <Calendar className="h-4 w-4 shrink-0 text-orange-500" />
            <span className="truncate font-semibold text-on-surface">{range}</span>
            <span className="text-on-surface-variant">/</span>
            <span className="shrink-0 font-display font-bold uppercase tracking-wide text-amber-600 dark:text-brand-highlight">{contextLabel}</span>
          </p>
          <div className="flex shrink-0 rounded-full bg-surface-container-high p-0.5 dark:bg-surface-container" role="tablist" aria-label="Date range">
            {[['today', 'Day'], ['week', 'Week'], ...(hasCfp ? [['cfp', 'CFP']] : [])].map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={scope === id}
                onClick={() => { setScope(id); setTab(null); }}
                className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${scope === id ? 'bg-brand text-white shadow' : 'text-on-surface-variant'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Live / Upcoming / Final */}
        <div className="gd-segment grid-cols-3" role="tablist" aria-label="Game status">
          {[['live', 'Live'], ['upcoming', 'Upcoming'], ['final', 'Final']].map(([id, label]) => (
            <button key={id} role="tab" aria-selected={activeTab === id} onClick={() => setTab(id)}>
              {id === 'live' && counts.live > 0 && <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
              {label} <span className="text-on-surface-variant">({counts[id]})</span>
            </button>
          ))}
        </div>

        {/* Conference / Top 25 / My Teams */}
        <div className="gd-chip-row" role="toolbar" aria-label="Filter games">
          {FILTERS.filter(f => f.id !== 'mine' || favoriteTeams.length).map(({ id, label, icon: Icon }) => (
            <button key={id} className="gd-chip" aria-pressed={filter === id} onClick={() => setFilter(filter === id ? null : id)}>
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        ) : !tabGames.length ? (
          <div className="gd-card px-6 py-12 text-center">
            <p className="text-4xl">🏈</p>
            <p className="mt-2 font-display text-xl font-bold uppercase text-on-surface">
              {activeTab === 'live' ? 'No games live right now' : activeTab === 'upcoming' ? 'No upcoming games' : 'No final scores yet'}
            </p>
            <p className="mt-1 text-sm text-on-surface-variant">
              {filter || searchQuery ? 'Try a different filter.' : 'Check the other tabs or switch the date range.'}
            </p>
          </div>
        ) : (
          <>
            {featured && <FeaturedGame game={featured} onOpen={openGame} />}

            {groups.map(([label, list]) => list.length > 0 && (
              <section key={label || 'live'} className="space-y-3">
                <h2 className="flex items-center justify-between pt-2 font-display text-lg font-bold uppercase tracking-wide text-on-surface">
                  <span className="flex items-center gap-2">
                    {activeTab === 'live' ? <><span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />Live in progress</> : label}
                  </span>
                  <span className="text-xs font-semibold normal-case text-on-surface-variant">{list.length} {list.length === 1 ? 'game' : 'games'}</span>
                </h2>
                {list.map(g => <ScoreCard key={g.id} game={g} favorite={isFavorite(g)} onOpen={openGame} />)}
              </section>
            ))}
          </>
        )}

        {/* Tailgate Radar: today's public tailgates */}
        {tailgates.length > 0 && (
          <section className="space-y-3 pt-2">
            <h2 className="flex items-center justify-between font-display text-lg font-bold uppercase tracking-wide text-on-surface">
              <span className="flex items-center gap-2"><PartyPopper className="h-5 w-5 text-orange-500" />Tailgate Radar</span>
              <button className="text-sm font-semibold normal-case text-orange-600 dark:text-brand-soft" onClick={() => navigate(createPageUrl('TailgateDirectory'))}>
                See all
              </button>
            </h2>
            {tailgates.slice(0, 3).map(t => (
              <button
                key={t.id}
                className="gd-card flex w-full items-center gap-3 p-3 text-left"
                onClick={() => navigate(createPageUrl('TailgateDetail') + `?id=${t.id}`)}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand/15 text-2xl">
                  {t.photo_url ? <img src={t.photo_url} alt="" className="h-full w-full object-cover" /> : '🔥'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-on-surface">{t.name}</p>
                  <p className="flex items-center gap-1 truncate text-xs text-on-surface-variant">
                    <MapPin className="h-3 w-3" />{t.location?.lot_name || 'Location TBD'} · {t.start_time || 'Time TBD'} · {t.rsvp_count || 0} going
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-on-surface-variant" />
              </button>
            ))}
          </section>
        )}
      </main>

      <SafetyButton />
    </div>
  );
}
