import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchGamesForCalendarEntry,
  fetchRankings,
  fetchSeasonCalendar,
  fetchTeamSchedule,
  getCurrentSeason,
  POPULAR_TEAMS,
} from '@/lib/sportsApi';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import {
  Calendar as CalendarIcon, ChevronRight, ChevronLeft, Tv, Trophy, TrendingUp, TrendingDown,
  Search, X, Star, RefreshCw, Flame,
} from 'lucide-react';
import AppHeader from '@/components/layout/AppHeader';
import SafetyButton from '@/components/common/SafetyButton';
import { Skeleton } from '@/components/common/LoadingSkeleton';
import TeamDetailView, { ArticleView } from '@/components/teams/TeamDetailView';
import ScheduleGameCard from '@/components/feed-v2/ScheduleGameCard';
import { cn } from '@/lib/utils';

const localDateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const TABS = [
  { id: 'season', label: 'Season', icon: CalendarIcon },
  { id: 'team', label: 'By Team', icon: Star },
  { id: 'rankings', label: 'Rankings', icon: Trophy },
];

const GAME_FILTERS = [
  { id: 'all', label: 'All Games' },
  { id: 'top25', label: 'Top 25', icon: Star },
  { id: 'ranked', label: 'Ranked vs Ranked', icon: Flame },
];

function RankDelta({ team }) {
  if (!team.previous_rank || team.previous_rank === team.rank || team.trend === 'same') {
    return <span className="text-xs font-semibold text-on-surface-variant">–</span>;
  }
  const up = team.trend === 'up';
  const diff = Math.abs(team.previous_rank - team.rank);
  return (
    <span className={cn('flex items-center gap-0.5 text-xs font-bold tabular-nums', up ? 'text-emerald-600 dark:text-brand-win' : 'text-red-600')}>
      {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
      {up ? '+' : '-'}{diff}
    </span>
  );
}

export default function Schedule() {
  const navigate = useNavigate();
  // ?tab=rankings / ?tab=team deep-link (e.g. from News "Full poll")
  const [activeTab, setActiveTab] = useState(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    return TABS.some(x => x.id === t) ? t : 'season';
  });
  const [seasonYear, setSeasonYear] = useState(() => getCurrentSeason());
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamSearch, setTeamSearch] = useState('');
  const [gameFilter, setGameFilter] = useState('all');
  const [viewingTeamDetail, setViewingTeamDetail] = useState(null);
  const [viewingArticle, setViewingArticle] = useState(null);
  const weekChipRefs = useRef({});

  const { data: calendarEntries = [], isLoading: calendarLoading } = useQuery({
    queryKey: ['season-calendar', seasonYear],
    queryFn: () => fetchSeasonCalendar(seasonYear),
    staleTime: 24 * 60 * 60 * 1000,
  });

  useEffect(() => {
    if (!calendarEntries.length) return;
    const now = new Date();

    // First, find all entries that contain "now"
    const matchingIndices = calendarEntries
      .map((e, idx) => {
        const start = e.startDate ? new Date(e.startDate) : null;
        const end = e.endDate ? new Date(e.endDate) : null;
        if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return -1;
        return (now >= start && now <= end) ? idx : -1;
      })
      .filter(idx => idx >= 0);

    if (matchingIndices.length > 0) {
      // Prefer CFP or Bowls over regular weeks if we're in postseason time
      const cfpIdx = matchingIndices.find(i => calendarEntries[i].label === 'CFP');
      const bowlsIdx = matchingIndices.find(i => calendarEntries[i].label === 'Bowls');
      if (cfpIdx !== undefined) {
        setSelectedWeekIndex(cfpIdx);
      } else if (bowlsIdx !== undefined) {
        setSelectedWeekIndex(bowlsIdx);
      } else {
        setSelectedWeekIndex(matchingIndices[0]);
      }
    } else {
      // Find the next upcoming entry
      const futureIdx = calendarEntries.findIndex(e => {
        const start = e.startDate ? new Date(e.startDate) : null;
        return start && !Number.isNaN(start.getTime()) && start > now;
      });
      setSelectedWeekIndex(futureIdx >= 0 ? futureIdx : Math.max(0, calendarEntries.length - 1));
    }
  }, [calendarEntries]);

  // Keep the selected week chip in view
  useEffect(() => {
    weekChipRefs.current[selectedWeekIndex]?.scrollIntoView?.({ inline: 'center', block: 'nearest' });
  }, [selectedWeekIndex, calendarEntries.length, activeTab]);

  const selectedEntry = calendarEntries[selectedWeekIndex];

  const { data: games = [], isLoading: gamesLoading, refetch, isFetching } = useQuery({
    queryKey: ['calendar-entry-games', seasonYear, selectedEntry?.label, selectedEntry?.value],
    queryFn: () => fetchGamesForCalendarEntry(selectedEntry, seasonYear),
    staleTime: 60000,
    enabled: !!selectedEntry,
  });

  // Fetch rankings
  const { data: rankings = [], isLoading: rankingsLoading } = useQuery({
    queryKey: ['rankings'],
    queryFn: fetchRankings,
    staleTime: 300000,
  });

  // Fetch team schedule when a team is selected
  const { data: teamSchedule = [], isLoading: teamScheduleLoading } = useQuery({
    queryKey: ['team-schedule', selectedTeam?.id],
    queryFn: () => fetchTeamSchedule(selectedTeam?.id),
    enabled: !!selectedTeam?.id,
    staleTime: 300000,
  });

  // Filter teams based on search
  const filteredTeams = useMemo(() => {
    if (!teamSearch) return POPULAR_TEAMS;
    const query = teamSearch.toLowerCase();
    return POPULAR_TEAMS.filter(team =>
      team.name.toLowerCase().includes(query) ||
      team.abbreviation.toLowerCase().includes(query)
    );
  }, [teamSearch]);

  // Filter games based on filter selection
  const filteredGames = useMemo(() => {
    if (gameFilter === 'top25') return games.filter(g => g.home_rank || g.away_rank);
    if (gameFilter === 'ranked') return games.filter(g => g.home_rank && g.away_rank);
    return games;
  }, [games, gameFilter]);

  // Group games by local calendar day (sorted chronologically, TBD last)
  const gamesByDate = useMemo(() => {
    const grouped = new Map();
    filteredGames.forEach(game => {
      const d = game.full_date ? new Date(game.full_date) : null;
      const key = d && !Number.isNaN(d.getTime()) ? localDateKey(d) : 'TBD';
      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          date: key === 'TBD' ? 'Date TBD' : d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
          games: [],
        });
      }
      grouped.get(key).games.push(game);
    });
    return [...grouped.values()].sort((a, b) => {
      if (a.key === 'TBD') return 1;
      if (b.key === 'TBD') return -1;
      return a.key.localeCompare(b.key);
    });
  }, [filteredGames]);

  const liveGames = games.filter(g => g.status === 'live');
  const upcomingGames = games.filter(g => g.status === 'upcoming');
  const completedGames = games.filter(g => g.status === 'final');
  const todayKey = localDateKey(new Date());

  // Current AP top teams and their game in the selected week
  const showPollPreview = seasonYear === getCurrentSeason() && rankings.length > 0 && games.length > 0;
  const pollPreview = useMemo(() => rankings.slice(0, 6).map(team => {
    const game = games.find(g => team.team_id && (String(g.home_team_id) === String(team.team_id) || String(g.away_team_id) === String(team.team_id)));
    let matchup = null;
    if (game) {
      const isHome = String(game.home_team_id) === String(team.team_id);
      const oppRank = isHome ? game.away_rank : game.home_rank;
      const opp = isHome ? (game.away_short || game.away_team) : (game.home_short || game.home_team);
      const state = game.status === 'live' ? 'Live' : game.status === 'final'
        ? `Final ${isHome ? game.home_score : game.away_score}-${isHome ? game.away_score : game.home_score}`
        : `${game.game_date}, ${game.game_time}`;
      matchup = { text: `${isHome ? 'vs' : 'at'} ${oppRank ? `#${oppRank} ` : ''}${opp}`, state, live: game.status === 'live', game };
    }
    return { team, matchup };
  }), [rankings, games]);

  const navigateWeek = (direction) => {
    if (direction === 'next' && selectedWeekIndex < calendarEntries.length - 1) {
      setSelectedWeekIndex(selectedWeekIndex + 1);
    } else if (direction === 'prev' && selectedWeekIndex > 0) {
      setSelectedWeekIndex(selectedWeekIndex - 1);
    }
  };

  const openGame = (g) =>
    navigate(createPageUrl('LiveGame') + `?gameId=${g.id}&home=${encodeURIComponent(g.home_team)}&away=${encodeURIComponent(g.away_team)}`);

  const entryRange = selectedEntry
    ? (selectedEntry.detail
      ? selectedEntry.detail
      : (selectedEntry.startDate && selectedEntry.endDate
        ? `${new Date(selectedEntry.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(selectedEntry.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        : ''))
    : '';
  const phaseLabel = selectedEntry?.label === 'CFP' ? 'College Football Playoff'
    : selectedEntry?.label === 'Bowls' ? 'Bowl Season'
      : selectedEntry?.label === 'All-Star' ? 'All-Star Games'
        : 'Regular Season';

  return (
    <div className="gd-page">
      <AppHeader
        eyebrow="Saturday Live"
        title="Schedule"
        subtitle={`${seasonYear} season`}
        back="Home"
        actions={
          <button
            type="button"
            aria-label="Refresh schedule"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface"
          >
            <RefreshCw className={`h-5 w-5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        }
      >
        <div className="gd-segment grid-cols-3" role="tablist" aria-label="Schedule view">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" role="tab" aria-selected={activeTab === id} onClick={() => setActiveTab(id)}>
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </AppHeader>

      <main className="space-y-4 px-4 pt-4">
        {/* ---------------- Season view: games by week ---------------- */}
        {activeTab === 'season' && (
          <>
            {/* Season year */}
            <div className="gd-chip-row" role="toolbar" aria-label="Season">
              {[getCurrentSeason() - 2, getCurrentSeason() - 1, getCurrentSeason()].map(year => (
                <button
                  key={year}
                  type="button"
                  className="gd-chip"
                  aria-pressed={seasonYear === year}
                  onClick={() => {
                    setSeasonYear(year);
                    setSelectedWeekIndex(0);
                  }}
                >
                  {year} Season
                </button>
              ))}
            </div>

            {/* Week selector */}
            <section className="gd-card p-3.5" aria-label="Week">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Previous week"
                  onClick={() => navigateWeek('prev')}
                  disabled={calendarLoading || selectedWeekIndex === 0}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-container-high text-on-surface disabled:opacity-40 dark:bg-surface"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="min-w-0 flex-1 text-center">
                  <p className="gd-eyebrow truncate">{phaseLabel}</p>
                  <p className="truncate font-display text-xl font-bold uppercase leading-tight text-on-surface">
                    {selectedEntry?.label || (calendarLoading ? 'Loading…' : 'No weeks')}
                  </p>
                  {entryRange && <p className="truncate text-xs text-on-surface-variant">{entryRange}</p>}
                </div>
                <button
                  type="button"
                  aria-label="Next week"
                  onClick={() => navigateWeek('next')}
                  disabled={calendarLoading || selectedWeekIndex === calendarEntries.length - 1}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-container-high text-on-surface disabled:opacity-40 dark:bg-surface"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              {/* Quick week chips */}
              <div className="-mx-3.5 mt-3 flex gap-2 overflow-x-auto px-3.5 pb-1 [scrollbar-width:none]" role="tablist" aria-label="Select week">
                {calendarEntries.map((entry, idx) => {
                  let label = entry.label;
                  if (label.startsWith('Week ')) label = `Wk ${entry.value}`;
                  const isCFP = entry.label === 'CFP';
                  const isBowls = entry.label === 'Bowls';
                  return (
                    <button
                      key={idx}
                      ref={(el) => { weekChipRefs.current[idx] = el; }}
                      type="button"
                      role="tab"
                      aria-selected={selectedWeekIndex === idx}
                      onClick={() => setSelectedWeekIndex(idx)}
                      className={cn('gd-chip', !(selectedWeekIndex === idx) && (isCFP || isBowls) && 'text-amber-600 dark:text-brand-highlight')}
                    >
                      {isCFP && <Trophy className="h-3.5 w-3.5" />}
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Counts */}
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-outline-variant/60 pt-3 dark:border-white/[0.06]">
                {[
                  ['Live', liveGames.length, 'text-red-600'],
                  ['Upcoming', upcomingGames.length, 'text-on-surface'],
                  ['Final', completedGames.length, 'text-on-surface-variant'],
                ].map(([label, n, color]) => (
                  <div key={label} className="rounded-xl bg-surface-container-high py-1.5 text-center dark:bg-surface">
                    <p className={cn('gd-score text-2xl leading-none', color)}>{n}</p>
                    <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">{label}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Game filter */}
            <div className="gd-chip-row" role="toolbar" aria-label="Filter games">
              {GAME_FILTERS.map(({ id, label, icon: Icon }) => (
                <button key={id} type="button" className="gd-chip" aria-pressed={gameFilter === id} onClick={() => setGameFilter(id)}>
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {label}
                  {id === 'all' && <span className="font-sans text-xs font-semibold opacity-70">{games.length}</span>}
                </button>
              ))}
            </div>

            {/* AP poll preview: where the top teams play this week */}
            {showPollPreview && (
              <section className="gd-card p-3.5" aria-label="AP Top 25 this week">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-display text-lg font-bold uppercase tracking-wide text-on-surface">
                    <Trophy className="h-4 w-4 text-amber-600 dark:text-brand-highlight" />
                    AP Top 25 this week
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('rankings')}
                    className="flex items-center gap-0.5 text-sm font-semibold text-orange-600 dark:text-brand-soft"
                  >
                    Full poll <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <ol className="space-y-1.5">
                  {pollPreview.map(({ team, matchup }) => (
                    <li key={team.rank}>
                      <button
                        type="button"
                        onClick={() => (matchup ? openGame(matchup.game) : setViewingTeamDetail({ id: team.team_id, name: team.team }))}
                        className="flex w-full items-center gap-3 rounded-xl bg-surface-container-high px-3 py-2 text-left dark:bg-surface"
                      >
                        <span className="w-5 text-center font-display text-lg font-bold text-on-surface-variant">{team.rank}</span>
                        {team.logo ? <img src={team.logo} alt="" className="h-7 w-7 object-contain" /> : <span className="h-7 w-7" />}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-on-surface">
                            {team.team} <span className="font-normal text-on-surface-variant">({team.record})</span>
                          </span>
                          <span className="flex items-center gap-1 truncate text-xs text-on-surface-variant">
                            {matchup ? (
                              <>
                                {matchup.live && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500 animate-pulse" />}
                                <span className="truncate">{matchup.text} · {matchup.state}</span>
                              </>
                            ) : 'No game this week'}
                          </span>
                        </span>
                        <RankDelta team={team} />
                      </button>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* Games by day */}
            {(calendarLoading || gamesLoading) ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-36 w-full rounded-2xl" />)}
              </div>
            ) : filteredGames.length > 0 ? (
              gamesByDate.map(({ key, date, games: dateGames }) => {
                const liveCount = dateGames.filter(g => g.status === 'live').length;
                return (
                  <section key={key} className="space-y-3">
                    <h2 className="flex items-center justify-between gap-2 pt-1 font-display text-lg font-bold uppercase tracking-wide text-on-surface">
                      <span className="flex min-w-0 items-center gap-2">
                        <CalendarIcon className="h-4 w-4 shrink-0 text-orange-500" />
                        <span className="truncate">{date}</span>
                      </span>
                      {liveCount > 0 ? (
                        <span className="gd-pill shrink-0 bg-red-600 text-white"><span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />{liveCount} live</span>
                      ) : key === todayKey ? (
                        <span className="gd-pill shrink-0 bg-brand text-white">Today</span>
                      ) : (
                        <span className="shrink-0 text-xs font-semibold normal-case text-on-surface-variant">
                          {dateGames.length} game{dateGames.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </h2>
                    {dateGames.map((game) => (
                      <ScheduleGameCard key={game.id} game={game} onTeamClick={setViewingTeamDetail} onOpenGame={openGame} />
                    ))}
                  </section>
                );
              })
            ) : (
              <div className="gd-card px-6 py-12 text-center">
                <CalendarIcon className="mx-auto mb-3 h-10 w-10 text-orange-500" />
                <p className="font-display text-xl font-bold uppercase text-on-surface">No games this week</p>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {gameFilter !== 'all' ? 'Try changing the filter.' : 'Try selecting a different week.'}
                </p>
              </div>
            )}
          </>
        )}

        {/* ---------------- Team schedule view ---------------- */}
        {activeTab === 'team' && (
          <>
            <section className="gd-card p-3.5" aria-label="Choose a team">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                <input
                  className="gd-input pl-10 pr-10"
                  placeholder="Search for a team…"
                  aria-label="Search for a team"
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                />
                {teamSearch && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setTeamSearch('')}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-on-surface-variant"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <p className="gd-eyebrow mb-2 mt-3">{teamSearch ? 'Search results' : 'Popular teams'}</p>
              <div className="grid grid-cols-2 gap-2">
                {filteredTeams.slice(0, 10).map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    aria-pressed={selectedTeam?.id === team.id}
                    onClick={() => setSelectedTeam(team)}
                    className={cn(
                      'flex items-center gap-2 rounded-xl border p-2 text-left transition-colors',
                      selectedTeam?.id === team.id
                        ? 'border-brand bg-brand/10'
                        : 'border-outline-variant bg-surface-container-high dark:border-white/[0.08] dark:bg-surface'
                    )}
                  >
                    <img
                      src={`https://a.espncdn.com/i/teamlogos/ncaa/500/${team.id}.png`}
                      alt=""
                      loading="lazy"
                      className="h-8 w-8 shrink-0 object-contain"
                    />
                    <span className="min-w-0">
                      <span className="line-clamp-2 font-display text-[15px] font-bold uppercase leading-tight text-on-surface">
                        {team.name}
                      </span>
                      <span className="block truncate text-[11px] text-on-surface-variant">{team.conference}</span>
                    </span>
                  </button>
                ))}
              </div>
              {!filteredTeams.length && (
                <p className="py-4 text-center text-sm text-on-surface-variant">No teams match “{teamSearch}”.</p>
              )}
            </section>

            {selectedTeam ? (
              <section className="space-y-3">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold uppercase tracking-wide text-on-surface">
                  <Star className="h-4 w-4 text-orange-500" />
                  <span className="truncate">{selectedTeam.name}</span>
                </h2>

                {teamScheduleLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
                  </div>
                ) : teamSchedule.length > 0 ? (
                  teamSchedule.map((game, idx) => (
                    <div key={game.id || idx} className={cn('gd-card flex items-center gap-3 p-3.5', game.status === 'live' && 'gd-card-glow')}>
                      <div className="w-12 shrink-0 text-center">
                        {game.status === 'live' ? (
                          <span className="gd-pill bg-red-600 text-white">Live</span>
                        ) : (
                          <>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Wk</p>
                            <p className="font-display text-xl font-bold leading-none text-on-surface">{game.week}</p>
                          </>
                        )}
                      </div>
                      {game.opponent_logo ? (
                        <img src={game.opponent_logo} alt="" loading="lazy" className="h-9 w-9 shrink-0 object-contain" />
                      ) : (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-[10px] font-bold text-on-surface-variant">
                          {game.opponent_abbrev || '?'}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-on-surface">
                          <span className="text-on-surface-variant">{game.is_home ? 'vs ' : '@ '}</span>
                          {game.opponent_rank && <span className="font-display font-bold text-orange-600 dark:text-brand-soft">#{game.opponent_rank} </span>}
                          {game.opponent}
                        </p>
                        <p className="flex items-center gap-1.5 truncate text-xs text-on-surface-variant">
                          <span>{game.game_date}</span>
                          {game.status !== 'final' && game.time && <span>· {game.time}</span>}
                          {game.tv_network && (
                            <span className="flex items-center gap-0.5">· <Tv className="h-3 w-3" />{game.tv_network}</span>
                          )}
                        </p>
                      </div>
                      {game.result && (
                        <div className="shrink-0 text-right">
                          <p className={cn('font-display text-xl font-bold leading-none', game.result.won ? 'text-emerald-600 dark:text-brand-win' : 'text-red-600')}>
                            {game.result.won ? 'W' : 'L'}
                          </p>
                          <p className="gd-score text-base text-on-surface">
                            {game.result.team_score}-{game.result.opponent_score}
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="gd-card px-6 py-12 text-center">
                    <CalendarIcon className="mx-auto mb-3 h-10 w-10 text-orange-500" />
                    <p className="font-display text-xl font-bold uppercase text-on-surface">No schedule available</p>
                  </div>
                )}
              </section>
            ) : (
              <div className="gd-card px-6 py-10 text-center">
                <Star className="mx-auto mb-3 h-10 w-10 text-orange-500" />
                <p className="font-display text-xl font-bold uppercase text-on-surface">Pick a team</p>
                <p className="mt-1 text-sm text-on-surface-variant">Select a team to view its full season schedule.</p>
              </div>
            )}
          </>
        )}

        {/* ---------------- Rankings view ---------------- */}
        {activeTab === 'rankings' && (
          rankingsLoading ? (
            <Skeleton className="h-[480px] w-full rounded-2xl" />
          ) : rankings.length > 0 ? (
            <section className="gd-card overflow-hidden" aria-label="AP Top 25">
              <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
                <h2 className="flex items-center gap-2 font-display text-xl font-bold uppercase tracking-wide text-on-surface">
                  <Trophy className="h-5 w-5 text-amber-600 dark:text-brand-highlight" />
                  AP Top 25
                </h2>
                <span className="text-xs font-semibold text-on-surface-variant">Tap a team for details</span>
              </div>
              <ol className="border-t border-outline-variant/70 dark:border-white/[0.06]">
                {rankings.map((team) => (
                  <li key={team.rank} className="border-b border-outline-variant/50 last:border-b-0 dark:border-white/[0.05]">
                    <button
                      type="button"
                      onClick={() => setViewingTeamDetail({ id: team.team_id, name: team.team })}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-container-high dark:hover:bg-surface"
                    >
                      <span
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-display text-lg font-bold',
                          team.rank <= 4 ? 'bg-brand text-white' : team.rank <= 12 ? 'bg-brand/15 text-orange-700 dark:text-brand-soft' : 'bg-surface-container-high text-on-surface-variant'
                        )}
                      >
                        {team.rank}
                      </span>
                      {team.logo ? <img src={team.logo} alt="" className="h-8 w-8 shrink-0 object-contain" /> : <span className="h-8 w-8 shrink-0" />}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-on-surface">{team.team}</span>
                        <span className="block text-xs text-on-surface-variant tabular-nums">
                          {team.record}{team.points ? ` · ${team.points} pts` : ''}
                        </span>
                      </span>
                      <RankDelta team={team} />
                      <ChevronRight className="h-4 w-4 shrink-0 text-on-surface-variant" />
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          ) : (
            <div className="gd-card px-6 py-12 text-center">
              <Trophy className="mx-auto mb-3 h-10 w-10 text-orange-500" />
              <p className="font-display text-xl font-bold uppercase text-on-surface">Rankings not available</p>
              <p className="mt-1 text-sm text-on-surface-variant">Check back during the season.</p>
            </div>
          )
        )}
      </main>

      <SafetyButton />

      {/* Team Detail View */}
      <TeamDetailView
        team={viewingTeamDetail}
        isOpen={!!viewingTeamDetail}
        onClose={() => setViewingTeamDetail(null)}
        onArticleClick={(article) => setViewingArticle(article)}
      />

      {/* Article View */}
      <ArticleView
        article={viewingArticle}
        isOpen={!!viewingArticle}
        onClose={() => setViewingArticle(null)}
      />
    </div>
  );
}
