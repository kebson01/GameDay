import React, { useEffect, useMemo, useState } from 'react';
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
  ArrowLeft, Calendar as CalendarIcon, ChevronRight, ChevronLeft, Tv, MapPin, 
  Trophy, TrendingUp, TrendingDown, Search, X, Star, Home as HomeIcon,
  Filter, RefreshCw, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import SafetyButton from '@/components/common/SafetyButton';
import { Skeleton } from '@/components/common/LoadingSkeleton';
import TeamDetailView, { ArticleView } from '@/components/teams/TeamDetailView';

export default function Schedule() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('season');
  const [seasonYear, setSeasonYear] = useState(() => getCurrentSeason());
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamSearch, setTeamSearch] = useState('');
  const [gameFilter, setGameFilter] = useState('all');
  const [viewingTeamDetail, setViewingTeamDetail] = useState(null);
  const [viewingArticle, setViewingArticle] = useState(null);

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
    if (gameFilter === 'all') return games;
    if (gameFilter === 'ranked') {
      return games.filter(g => g.home_rank || g.away_rank);
    }
    if (gameFilter === 'top25') {
      return games.filter(g => 
        (g.home_rank && g.home_rank <= 25) || 
        (g.away_rank && g.away_rank <= 25)
      );
    }
    return games;
  }, [games, gameFilter]);

  // Group games by date
  const gamesByDate = useMemo(() => {
    const grouped = {};
    filteredGames.forEach(game => {
      const date = game.full_date 
        ? new Date(game.full_date).toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
          })
        : 'TBD';
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(game);
    });
    
    // Sort dates
    const sortedDates = Object.keys(grouped).sort((a, b) => {
      if (a === 'TBD') return 1;
      if (b === 'TBD') return -1;
      return new Date(a) - new Date(b);
    });
    
    return sortedDates.map(date => ({ date, games: grouped[date] }));
  }, [filteredGames]);
  
  const liveGames = games.filter(g => g.status === 'live');
  const upcomingGames = games.filter(g => g.status === 'upcoming');
  const completedGames = games.filter(g => g.status === 'final');

  const navigateWeek = (direction) => {
    if (direction === 'next' && selectedWeekIndex < calendarEntries.length - 1) {
      setSelectedWeekIndex(selectedWeekIndex + 1);
    } else if (direction === 'prev' && selectedWeekIndex > 0) {
      setSelectedWeekIndex(selectedWeekIndex - 1);
    }
  };
  
  return (
    <div className="gd-page">
      {/* Header */}
      <div className="gd-header px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/20"
              onClick={() => navigate(createPageUrl('Home'))}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{seasonYear} Season Schedule</h1>
              <p className="text-white/80 text-sm">
                {selectedEntry?.label === 'CFP' ? '🏆 College Football Playoff' : 
                 selectedEntry?.label === 'Bowls' ? '🎉 Bowl Season' :
                 'All college football games'}
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Season Year Selector */}
        <div className="flex gap-2 mb-3">
          {[2024, 2025].map(year => (
            <button
              key={year}
              onClick={() => {
                setSeasonYear(year);
                setSelectedWeekIndex(0);
              }}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                seasonYear === year
                  ? 'bg-orange-500 text-white'
                  : 'bg-white/20 text-white/80 hover:bg-white/30'
              }`}
            >
              {year} Season
            </button>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="flex gap-3">
          <div className="flex-1 bg-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-red-400">{liveGames.length}</p>
            <p className="text-xs text-white/70">Live</p>
          </div>
          <div className="flex-1 bg-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-400">{upcomingGames.length}</p>
            <p className="text-xs text-white/70">Upcoming</p>
          </div>
          <div className="flex-1 bg-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-400">{completedGames.length}</p>
            <p className="text-xs text-white/70">Final</p>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="season" className="flex items-center gap-1">
              <CalendarIcon className="w-4 h-4" />
              Season
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-1">
              <Star className="w-4 h-4" />
              By Team
            </TabsTrigger>
            <TabsTrigger value="rankings" className="flex items-center gap-1">
              <Trophy className="w-4 h-4" />
              Rankings
            </TabsTrigger>
          </TabsList>
          
          {/* Season View - Games by Week */}
          <TabsContent value="season" className="space-y-4">
            {/* Week Navigation */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => navigateWeek('prev')}
                  disabled={calendarLoading || selectedWeekIndex === 0}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                
                <Select
                  value={String(selectedWeekIndex)}
                  onValueChange={(value) => setSelectedWeekIndex(Number(value))}
                >
                  <SelectTrigger className="w-[220px] font-semibold">
                    <SelectValue placeholder="Select week" />
                  </SelectTrigger>
                  <SelectContent>
                    {calendarEntries.map((entry, idx) => (
                      <SelectItem key={idx} value={String(idx)}>
                        {entry.label}{entry.detail ? ` (${entry.detail})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => navigateWeek('next')}
                  disabled={calendarLoading || selectedWeekIndex === calendarEntries.length - 1}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>

              {/* Quick Week Buttons - Scrollable */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
                {calendarEntries.map((entry, idx) => {
                  // Determine button label and style
                  let label = entry.label;
                  if (label.startsWith('Week ')) label = `W${entry.value}`;

                  const isCFP = entry.label === 'CFP';
                  const isBowls = entry.label === 'Bowls';
                  const isPostseason = isCFP || isBowls || entry.label === 'All-Star';
                  
                  // Determine button colors
                  let buttonClasses = 'bg-slate-100 text-slate-600 hover:bg-slate-200';
                  if (selectedWeekIndex === idx) {
                    if (isCFP) buttonClasses = 'bg-purple-600 text-white ring-2 ring-purple-300';
                    else if (isBowls) buttonClasses = 'bg-green-600 text-white ring-2 ring-green-300';
                    else buttonClasses = 'bg-orange-500 text-white ring-2 ring-orange-300';
                  } else {
                    if (isCFP) buttonClasses = 'bg-purple-100 text-purple-700 hover:bg-purple-200 font-bold';
                    else if (isBowls) buttonClasses = 'bg-green-100 text-green-700 hover:bg-green-200';
                  }
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedWeekIndex(idx)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${buttonClasses}`}
                    >
                      {isCFP ? '🏆 CFP' : label}
                    </button>
                  );
                })}
              </div>

              {/* Date Range Display */}
              {selectedEntry && (
                <p className="text-center text-sm text-slate-500 mt-2">
                  {selectedEntry.detail
                    ? selectedEntry.detail
                    : (selectedEntry.startDate && selectedEntry.endDate
                      ? `${new Date(selectedEntry.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(selectedEntry.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                      : '')}
                </p>
              )}

              {/* Filter */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                <Filter className="w-4 h-4 text-slate-400" />
                <Select value={gameFilter} onValueChange={setGameFilter}>
                  <SelectTrigger className="w-[150px] h-8 text-sm">
                    <SelectValue placeholder="Filter games" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Games ({games.length})</SelectItem>
                    <SelectItem value="ranked">Ranked Teams</SelectItem>
                    <SelectItem value="top25">Top 25 Only</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-slate-500 ml-auto">
                  {filteredGames.length} games
                </span>
              </div>
            </div>

            {/* Games List */}
            <div className="space-y-6">
              {(calendarLoading || gamesLoading) ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
                      <Skeleton className="h-4 w-1/3 mb-3" />
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Skeleton className="w-8 h-8 rounded-full" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                        <Skeleton className="h-6 w-8" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Skeleton className="w-8 h-8 rounded-full" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                        <Skeleton className="h-6 w-8" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredGames.length > 0 ? (
                gamesByDate.map(({ date, games: dateGames }) => (
                  <div key={date} className="space-y-3">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2 sticky top-0 bg-slate-100 py-2 z-10">
                      <CalendarIcon className="w-4 h-4 text-orange-500" />
                      {date}
                      <Badge variant="secondary" className="ml-auto">
                        {dateGames.length} game{dateGames.length !== 1 ? 's' : ''}
                      </Badge>
                    </h3>
                    {dateGames.map((game) => (
                      <GameCard key={game.id} game={game} onTeamClick={setViewingTeamDetail} />
                    ))}
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-white rounded-2xl">
                  <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600">No games this week</p>
                  <p className="text-sm text-slate-400 mt-1">
                    {gameFilter !== 'all' ? 'Try changing the filter' : 'Try selecting a different week'}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Team Schedule View */}
          <TabsContent value="team" className="space-y-4">
            {/* Team Search */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search for a team..."
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  className="pl-10"
                />
                {teamSearch && (
                  <button 
                    onClick={() => setTeamSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                )}
              </div>

              {/* Popular Teams */}
              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-medium">
                  {teamSearch ? 'Search Results' : 'Popular Teams'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {filteredTeams.slice(0, 10).map((team) => (
                    <button
                      key={team.id}
                      onClick={() => setSelectedTeam(team)}
                      className={`flex items-center gap-2 p-2 rounded-xl border transition-colors ${
                        selectedTeam?.id === team.id 
                          ? 'border-orange-500 bg-orange-50' 
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">
                        {team.abbreviation}
                      </div>
                      <span className="text-sm font-medium text-slate-900 truncate">
                        {team.name.split(' ').slice(-1)[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Team Schedule */}
            {selectedTeam && (
              <div className="space-y-3">
                <h2 className="font-bold text-slate-900 flex items-center gap-2">
                  <Star className="w-5 h-5 text-orange-500" />
                  {selectedTeam.name} Schedule
                </h2>

                {teamScheduleLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Skeleton key={i} className="h-20 w-full rounded-xl" />
                    ))}
                  </div>
                ) : teamSchedule.length > 0 ? (
                  <div className="space-y-3">
                    {teamSchedule.map((game, idx) => (
                      <div key={game.id || idx} className="bg-white rounded-xl shadow-sm p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={game.status === 'final' ? 'secondary' : 'default'} className={
                              game.status === 'live' ? 'bg-red-500' : 
                              game.status === 'final' ? '' : 'bg-blue-500'
                            }>
                              {game.status === 'live' ? 'LIVE' : 
                               game.status === 'final' ? 'FINAL' : 
                               `Week ${game.week}`}
                            </Badge>
                            <span className="text-sm text-slate-500">{game.game_date}</span>
                          </div>
                          {game.tv_network && (
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Tv className="w-3 h-3" />
                              {game.tv_network}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {game.is_home ? (
                              <span className="text-xs text-green-600 font-medium">vs</span>
                            ) : (
                              <span className="text-xs text-slate-400">@</span>
                            )}
                            {game.opponent_logo ? (
                              <img src={game.opponent_logo} alt="" className="w-8 h-8 object-contain" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">
                                {game.opponent_abbrev || '?'}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-slate-900">
                                {game.opponent_rank && <span className="text-orange-500">#{game.opponent_rank} </span>}
                                {game.opponent}
                              </p>
                              {game.status !== 'final' && (
                                <p className="text-xs text-slate-500">{game.time}</p>
                              )}
                            </div>
                          </div>
                          {game.result && (
                            <div className={`text-right ${game.result.won ? 'text-green-600' : 'text-red-600'}`}>
                              <p className="font-bold text-lg">
                                {game.result.won ? 'W' : 'L'}
                              </p>
                              <p className="text-sm">
                                {game.is_home 
                                  ? `${game.result.home_score}-${game.result.away_score}`
                                  : `${game.result.away_score}-${game.result.home_score}`
                                }
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-2xl">
                    <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600">No schedule available</p>
                  </div>
                )}
              </div>
            )}

            {!selectedTeam && (
              <div className="text-center py-12 bg-white rounded-2xl">
                <Star className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">Select a team to view their schedule</p>
              </div>
            )}
          </TabsContent>
          
          {/* Rankings View */}
          <TabsContent value="rankings" className="space-y-4">
            {rankingsLoading ? (
              <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            ) : rankings.length > 0 ? (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-orange-500 to-red-600 text-white">
                  <h2 className="font-bold flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    AP Top 25 / CFP Rankings
                  </h2>
                </div>
                <div className="divide-y divide-slate-100">
                  {rankings.map((team) => (
                    <button
                      key={team.rank}
                      onClick={() => {
                        setViewingTeamDetail({ id: team.team_id, name: team.team });
                      }}
                      className="w-full p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className={`w-8 h-8 flex items-center justify-center font-bold rounded-full ${
                        team.rank <= 4 ? 'bg-orange-500 text-white' : 
                        team.rank <= 12 ? 'bg-blue-500 text-white' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {team.rank}
                      </div>
                      <div className="flex-1 flex items-center gap-3">
                        {team.logo && (
                          <img src={team.logo} alt="" className="w-8 h-8 object-contain" />
                        )}
                        <div className="text-left">
                          <p className="font-semibold text-slate-900">{team.team}</p>
                          <p className="text-sm text-slate-500">{team.record}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {team.trend === 'up' && (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        )}
                        {team.trend === 'down' && (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                        {team.previous_rank && team.previous_rank !== team.rank && (
                          <span className={`text-xs ${
                            team.trend === 'up' ? 'text-green-500' : 
                            team.trend === 'down' ? 'text-red-500' : 'text-slate-400'
                          }`}>
                            {team.trend === 'up' ? `+${team.previous_rank - team.rank}` : 
                             team.trend === 'down' ? `${team.previous_rank - team.rank}` : '-'}
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl">
                <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">Rankings not available</p>
                <p className="text-sm text-slate-400 mt-1">Check back during the season</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
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

// Game Card Component
function GameCard({ game, onTeamClick }) {
  const isLive = game.status === 'live';
  const isFinal = game.status === 'final';
  const homeWinning = game.home_score > game.away_score;
  const awayWinning = game.away_score > game.home_score;
  const isTBD = game.home_team === 'TBD' && game.away_team === 'TBD';

  // Special card for TBD games (future CFP matchups)
  if (isTBD) {
    return (
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl shadow-sm border border-purple-200 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 text-white">
          <div className="flex items-center justify-between">
            <span className="font-semibold">
              🏆 {game.name?.includes('Championship') ? 'National Championship' : 'CFP Semifinal'}
            </span>
            {game.tv_network && (
              <div className="flex items-center gap-1 text-xs">
                <Tv className="w-3 h-3" />
                {game.tv_network}
              </div>
            )}
          </div>
        </div>
        <div className="p-4">
          <p className="font-bold text-slate-800 text-lg mb-2">
            {game.name || 'College Football Playoff'}
          </p>
          <div className="flex items-center gap-3 text-slate-600 mb-2">
            <span>{game.game_date}</span>
            <span>•</span>
            <span>{game.game_time}</span>
          </div>
          {game.venue && game.venue !== 'TBD' && (
            <p className="text-sm text-slate-500 flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {game.venue}
            </p>
          )}
          <div className="mt-3 pt-3 border-t border-purple-200">
            <p className="text-sm text-purple-600 font-medium">
              ⏳ Teams determined by earlier playoff rounds
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Status Bar */}
      <div className={`px-4 py-2 flex items-center justify-between text-sm font-semibold ${
        isLive ? 'bg-red-500 text-white' : 
        isFinal ? 'bg-slate-600 text-white' : 
        'bg-blue-500 text-white'
      }`}>
        <div className="flex items-center gap-2">
          {isLive && <span className="w-2 h-2 bg-white rounded-full animate-pulse" />}
          <span>
            {isLive ? (game.status_detail || 'LIVE') : 
             isFinal ? 'FINAL' : 
             game.game_time}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {game.tv_network && (
            <div className="flex items-center gap-1">
              <Tv className="w-3 h-3" />
              <span className="text-xs">{game.tv_network}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bowl/Game Name */}
      {game.name && !game.name.includes(' at ') && !game.name.includes(' vs ') && (
        <div className="px-4 py-1 bg-purple-50 border-b border-purple-100">
          <p className="text-xs text-purple-700 font-semibold">{game.name}</p>
        </div>
      )}

      {/* Teams */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
          <button 
            className="flex items-center gap-3 hover:bg-slate-50 rounded-lg p-1 -m-1 transition-colors"
            onClick={() => onTeamClick?.({ id: game.away_team_id, name: game.away_team })}
          >
            {game.away_logo ? (
              <img src={game.away_logo} alt="" className="w-10 h-10 object-contain" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">
                {game.away_abbrev || '?'}
              </div>
            )}
            <div className="text-left">
              <div className={`font-semibold ${awayWinning && isFinal ? 'text-green-600' : ''}`}>
                {game.away_rank && <span className="text-orange-500 text-sm">#{game.away_rank} </span>}
                {game.away_team}
              </div>
              {game.away_record && (
                <p className="text-xs text-slate-500">{game.away_record}</p>
              )}
            </div>
          </button>
          <span className={`text-2xl font-bold min-w-[40px] text-right ${
            isFinal && awayWinning ? 'text-green-600' : 
            isFinal ? 'text-slate-400' : 
            'text-slate-700'
          }`}>
            {isLive || isFinal ? game.away_score : '-'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <button 
            className="flex items-center gap-3 hover:bg-slate-50 rounded-lg p-1 -m-1 transition-colors"
            onClick={() => onTeamClick?.({ id: game.home_team_id, name: game.home_team })}
          >
            {game.home_logo ? (
              <img src={game.home_logo} alt="" className="w-10 h-10 object-contain" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">
                {game.home_abbrev || '?'}
              </div>
            )}
            <div className="text-left">
              <div className={`font-semibold ${homeWinning && isFinal ? 'text-green-600' : ''}`}>
                {game.home_rank && <span className="text-orange-500 text-sm">#{game.home_rank} </span>}
                {game.home_team}
              </div>
              {game.home_record && (
                <p className="text-xs text-slate-500">{game.home_record}</p>
              )}
            </div>
          </button>
          <span className={`text-2xl font-bold min-w-[40px] text-right ${
            isFinal && homeWinning ? 'text-green-600' : 
            isFinal ? 'text-slate-400' : 
            'text-slate-700'
          }`}>
            {isLive || isFinal ? game.home_score : '-'}
          </span>
        </div>

        {/* Venue & Additional Info */}
        {(game.venue || game.headline) && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
            {game.headline && (
              <p className="text-xs text-orange-600 font-medium">{game.headline}</p>
            )}
            {game.venue && (
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {game.venue}
              </p>
            )}
            {game.odds && !isFinal && (
              <p className="text-xs text-slate-400">Line: {game.odds}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
