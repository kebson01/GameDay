import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/lib/auth';
import { client } from '@/api/client';
import { fetchScoreboard, fetchWeekByNumber, fetchGamesForCalendarEntry, fetchSeasonCalendar, getCurrentSeason } from '@/lib/sportsApi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { 
  ArrowLeft, Tv, Radio, PartyPopper, RefreshCw, Users, X, Search, 
  Star, Clock, Calendar, Wifi, WifiOff, Trophy, Flame, Play, 
  CheckCircle2, Timer, MapPin, ChevronRight, Sparkles, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SafetyButton from '@/components/common/SafetyButton';
import { toast } from 'sonner';
import AuthModal from '@/components/auth/AuthModal';
import TeamDetailView, { ArticleView } from '@/components/teams/TeamDetailView';

export default function GameDay() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingTeam, setViewingTeam] = useState(null);
  const [viewingArticle, setViewingArticle] = useState(null);

  useEffect(() => {
    auth.me().then(setUser).catch(() => {});
  }, []);

  const favoriteTeams = user?.favorite_teams || [];
  const [viewMode, setViewMode] = useState('week');
  
  const { data: calendar = [] } = useQuery({
    queryKey: ['season-calendar', getCurrentSeason()],
    queryFn: () => fetchSeasonCalendar(getCurrentSeason()),
    staleTime: 24 * 60 * 60 * 1000,
  });
  
  const { data: games = [], isLoading, refetch, isError, isFetching } = useQuery({
    queryKey: ['games', viewMode, getCurrentSeason()],
    queryFn: async () => {
      const year = getCurrentSeason();
      
      if (viewMode === 'today') {
        // Today: show today's games, or next day with games if none today
        const allGames = await fetchScoreboard();
        const today = new Date().toISOString().split('T')[0];
        
        // First, check for live games and today's games
        const todayGames = allGames.filter(g => {
          const gameDate = g.full_date?.split('T')[0];
          return gameDate === today || g.status === 'live';
        });
        
        // If we have games today, show them
        if (todayGames.length > 0) {
          return todayGames.sort((a, b) => new Date(a.full_date) - new Date(b.full_date));
        }
        
        // Otherwise, find the next day that has games and show those
        const upcomingGames = allGames
          .filter(g => g.status === 'upcoming')
          .sort((a, b) => new Date(a.full_date) - new Date(b.full_date));
        
        if (upcomingGames.length > 0) {
          const nextGameDate = upcomingGames[0].full_date?.split('T')[0];
          return upcomingGames.filter(g => g.full_date?.split('T')[0] === nextGameDate);
        }
        
        return allGames;
      }
      
      if (viewMode === 'cfp') {
        const cfpEntry = calendar.find(e => e.label === 'CFP');
        if (cfpEntry) {
          return fetchGamesForCalendarEntry(cfpEntry, year);
        }
        const { games } = await fetchWeekByNumber(999, 3, year);
        return games;
      }
      
      // "This Week" - show ALL upcoming games from scoreboard
      // The scoreboard returns all current/upcoming games which is what users expect
      const allGames = await fetchScoreboard();
      
      // Filter to games within the next 7 days
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      return allGames
        .filter(g => {
          if (g.status === 'live') return true; // Always show live games
          const gameDate = g.full_date ? new Date(g.full_date) : null;
          if (!gameDate) return true;
          return gameDate >= now && gameDate <= weekFromNow;
        })
        .sort((a, b) => new Date(a.full_date) - new Date(b.full_date));
    },
    refetchInterval: 60000,
    staleTime: 30000,
    enabled: calendar.length > 0 || viewMode === 'today' || viewMode === 'week',
  });
  
  const { data: tailgates = [] } = useQuery({
    queryKey: ['today-tailgates'],
    queryFn: () => {
      const today = new Date().toISOString().split('T')[0];
      return client.entities.Tailgate.filter({ game_date: today, is_public: true });
    },
  });
  
  const rsvpMutation = useMutation({
    mutationFn: async (tailgateId) => {
      const tailgate = tailgates.find(t => t.id === tailgateId);
      return client.entities.Tailgate.update(tailgateId, {
        rsvp_count: (tailgate?.rsvp_count || 0) + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['today-tailgates']);
      toast.success('RSVP confirmed!');
    }
  });
  
  const handleRefresh = () => {
    refetch();
    toast.success('Refreshing scores...', { duration: 1500 });
  };
  
  const handleAuthSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    setShowAuthModal(false);
  };
  
  const isGameFavorite = (game) => {
    return favoriteTeams.some(team => 
      game.home_team?.toLowerCase().includes(team.toLowerCase()) ||
      game.away_team?.toLowerCase().includes(team.toLowerCase())
    );
  };
  
  // Filter and categorize games
  const filteredGames = useMemo(() => {
    let filtered = games;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(g => 
        g.home_team?.toLowerCase().includes(q) ||
        g.away_team?.toLowerCase().includes(q)
      );
    }
    
    return filtered;
  }, [games, searchQuery]);
  
  const liveGames = filteredGames.filter(g => g.status === 'live');
  const upcomingGames = filteredGames.filter(g => g.status === 'upcoming');
  const finalGames = filteredGames.filter(g => g.status === 'final');
  
  // Counts for badges
  const allLiveCount = games.filter(g => g.status === 'live').length;
  const allUpcomingCount = games.filter(g => g.status === 'upcoming').length;
  const allFinalCount = games.filter(g => g.status === 'final').length;
  
  const displayGames = statusFilter === 'all' 
    ? filteredGames 
    : statusFilter === 'live' 
    ? liveGames 
    : statusFilter === 'upcoming' 
    ? upcomingGames 
    : finalGames;
  
  // Group games by date
  const gamesByDate = useMemo(() => {
    const grouped = {};
    displayGames.forEach(game => {
      const dateKey = game.full_date 
        ? new Date(game.full_date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
        : 'TBD';
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(game);
    });
    
    return Object.entries(grouped).sort((a, b) => {
      if (a[0] === 'TBD') return 1;
      if (b[0] === 'TBD') return -1;
      return new Date(a[0]) - new Date(b[0]);
    });
  }, [displayGames]);

  // Enhanced Game Card
  const GameCard = ({ game }) => {
    const isLive = game.status === 'live';
    const isFinal = game.status === 'final';
    const homeWinning = game.home_score > game.away_score;
    const awayWinning = game.away_score > game.home_score;
    const isTBD = game.home_team === 'TBD' && game.away_team === 'TBD';
    const isFavorite = isGameFavorite(game);
    
    const handleGameClick = () => {
      // Navigate to LiveGame for live games or any game with an ID
      if (game.id) {
        navigate(createPageUrl('LiveGame') + 
          `?gameId=${game.id}` +
          `&home=${encodeURIComponent(game.home_team)}` +
          `&away=${encodeURIComponent(game.away_team)}`
        );
      }
    };

    // TBD Playoff game card
    if (isTBD) {
      return (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-4 shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span className="text-white font-bold">
                {game.name?.includes('Championship') ? 'National Championship' : 'CFP Semifinal'}
              </span>
            </div>
            <h3 className="text-white text-lg font-bold mb-2">{game.name || 'College Football Playoff'}</h3>
            <div className="flex flex-wrap gap-3 text-purple-200 text-sm">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {game.game_date}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {game.game_time}
              </span>
              {game.tv_network && (
                <span className="flex items-center gap-1">
                  <Tv className="w-4 h-4" />
                  {game.tv_network}
                </span>
              )}
            </div>
            {game.venue && game.venue !== 'TBD' && (
              <p className="text-purple-300 text-sm mt-2 flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {game.venue}
              </p>
            )}
            <div className="mt-3 inline-flex items-center gap-1 bg-white/20 text-white text-xs px-3 py-1.5 rounded-full">
              <Sparkles className="w-3 h-3" />
              Teams TBD
            </div>
          </div>
        </div>
      );
    }

    return (
      <div 
        className={`relative bg-white rounded-2xl shadow-sm border overflow-hidden transition-all ${
          isLive 
            ? 'border-red-200 cursor-pointer hover:shadow-lg hover:scale-[1.01]' 
            : isFinal 
            ? 'border-slate-200' 
            : 'border-slate-100 hover:border-orange-200'
        }`}
        onClick={handleGameClick}
      >
        {/* Favorite indicator */}
        {isFavorite && (
          <div className="absolute top-3 right-3 z-10">
            <div className="bg-orange-500 rounded-full p-1.5 shadow-md">
              <Star className="w-3 h-3 text-white fill-white" />
            </div>
          </div>
        )}

        {/* Status header */}
        <div className={`px-4 py-2 flex items-center justify-between ${
          isLive 
            ? 'bg-gradient-to-r from-red-500 to-red-600' 
            : isFinal 
            ? 'bg-slate-100' 
            : 'bg-gradient-to-r from-slate-50 to-slate-100'
        }`}>
          <div className="flex items-center gap-2">
            {isLive ? (
              <>
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-white text-xs font-bold tracking-wide">
                  LIVE • {game.quarter} {game.time_remaining}
                </span>
              </>
            ) : isFinal ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-slate-500" />
                <span className="text-slate-600 text-xs font-semibold">FINAL</span>
              </>
            ) : (
              <>
                <Timer className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600 text-xs font-medium">{game.game_time}</span>
              </>
            )}
          </div>
          {game.tv_network && (
            <Badge variant="outline" className={`text-xs ${isLive ? 'bg-white/20 text-white border-white/30' : ''}`}>
              <Tv className="w-3 h-3 mr-1" />
              {game.tv_network}
            </Badge>
          )}
        </div>

        {/* Bowl/Game name */}
        {game.name && !game.name.includes(' at ') && !game.name.includes(' vs ') && (
          <div className="px-4 py-2 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100">
            <p className="text-xs text-purple-700 font-semibold flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              {game.name}
            </p>
          </div>
        )}

        {/* Teams */}
        <div className="p-4 space-y-3">
          {/* Away Team */}
          <div className="flex items-center justify-between">
            <button 
              className="flex items-center gap-3 flex-1 hover:bg-slate-50 rounded-xl p-2 -m-2 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                if (game.away_team !== 'TBD') {
                  setViewingTeam({ id: game.away_team_id, name: game.away_team });
                }
              }}
            >
              {game.away_logo ? (
                <img src={game.away_logo} alt="" className="w-10 h-10 object-contain" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  {game.away_abbrev || game.away_team?.substring(0, 3).toUpperCase()}
                </div>
              )}
              <div className="text-left">
                {game.away_rank && (
                  <span className="text-xs font-bold text-orange-500">#{game.away_rank}</span>
                )}
                <p className={`font-semibold ${awayWinning && isFinal ? 'text-green-600' : 'text-slate-900'}`}>
                  {game.away_team}
                </p>
              </div>
            </button>
            {(isLive || isFinal) && (
              <span className={`text-2xl font-bold tabular-nums ${
                awayWinning ? 'text-green-600' : 'text-slate-400'
              }`}>
                {game.away_score}
              </span>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-xs text-slate-400 font-medium">VS</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {/* Home Team */}
          <div className="flex items-center justify-between">
            <button 
              className="flex items-center gap-3 flex-1 hover:bg-slate-50 rounded-xl p-2 -m-2 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                if (game.home_team !== 'TBD') {
                  setViewingTeam({ id: game.home_team_id, name: game.home_team });
                }
              }}
            >
              {game.home_logo ? (
                <img src={game.home_logo} alt="" className="w-10 h-10 object-contain" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  {game.home_abbrev || game.home_team?.substring(0, 3).toUpperCase()}
                </div>
              )}
              <div className="text-left">
                {game.home_rank && (
                  <span className="text-xs font-bold text-orange-500">#{game.home_rank}</span>
                )}
                <p className={`font-semibold ${homeWinning && isFinal ? 'text-green-600' : 'text-slate-900'}`}>
                  {game.home_team}
                </p>
              </div>
            </button>
            {(isLive || isFinal) && (
              <span className={`text-2xl font-bold tabular-nums ${
                homeWinning ? 'text-green-600' : 'text-slate-400'
              }`}>
                {game.home_score}
              </span>
            )}
          </div>
        </div>

        {/* Footer info */}
        {game.venue && !isFinal && (
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {game.venue}
            </p>
          </div>
        )}

        {/* Live game action prompt */}
        {isLive && (
          <div className="px-4 py-2 bg-red-50 border-t border-red-100 flex items-center justify-between">
            <span className="text-xs text-red-600 font-medium flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Tap for live play-by-play
            </span>
            <ChevronRight className="w-4 h-4 text-red-400" />
          </div>
        )}
      </div>
    );
  };

  // Stats cards
  const statsData = [
    { label: 'Live', count: allLiveCount, icon: Flame, color: 'red', filter: 'live' },
    { label: 'Upcoming', count: allUpcomingCount, icon: Clock, color: 'blue', filter: 'upcoming' },
    { label: 'Final', count: allFinalCount, icon: CheckCircle2, color: 'slate', filter: 'final' },
  ];

  return (
    <div className="gd-page">
      {/* Header */}
      <div className="gd-header px-4 pt-6 pb-4">
        <div className="flex items-center justify-between">
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
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Radio className="w-5 h-5" />
                Game Day Live
              </h1>
              <p className="text-white/80 text-sm flex items-center gap-1">
                <Wifi className="w-3 h-3" />
                Live from ESPN • Auto-refreshing
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={handleRefresh}
            disabled={isFetching}
          >
            <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
      
      {/* View Mode Toggle - Improved */}
      <div className="px-4 py-4 bg-white border-b border-slate-200">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('today')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              viewMode === 'today' 
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Play className="w-4 h-4" />
            Up Next
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              viewMode === 'week' 
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Timer className="w-4 h-4" />
            This Week
          </button>
          <button
            onClick={() => setViewMode('cfp')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              viewMode === 'cfp' 
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25' 
                : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
            }`}
          >
            <Trophy className="w-4 h-4" />
            CFP
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      {!isLoading && games.length > 0 && (
        <div className="px-4 py-4 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-3 gap-3">
            {statsData.map(({ label, count, icon: Icon, color, filter }) => (
              <button
                key={label}
                onClick={() => setStatusFilter(statusFilter === filter ? 'all' : filter)}
                className={`p-3 rounded-xl transition-all ${
                  statusFilter === filter 
                    ? color === 'red' 
                      ? 'bg-red-500 text-white shadow-lg' 
                      : color === 'blue'
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-slate-600 text-white shadow-lg'
                    : 'bg-white border border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${
                    statusFilter === filter 
                      ? 'text-white' 
                      : color === 'red' 
                      ? 'text-red-500' 
                      : color === 'blue'
                      ? 'text-blue-500'
                      : 'text-slate-500'
                  }`} />
                  <span className={`text-2xl font-bold ${
                    statusFilter !== filter && 'text-slate-900'
                  }`}>
                    {count}
                  </span>
                </div>
                <p className={`text-xs font-medium ${
                  statusFilter === filter ? 'text-white/80' : 'text-slate-500'
                }`}>
                  {label}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Search */}
      <div className="px-4 py-3 bg-white border-b border-slate-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by team name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-slate-50"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="px-4 py-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-orange-200 rounded-full" />
              <div className="absolute inset-0 w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-slate-600 mt-4 font-medium">Loading scores...</p>
            <p className="text-slate-400 text-sm">Fetching live data from ESPN</p>
          </div>
        ) : isError ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <WifiOff className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Connection Error</h3>
            <p className="text-slate-600 mb-4">Could not load scores. Check your connection.</p>
            <Button onClick={() => refetch()} className="gd-btn-primary">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        ) : displayGames.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🏈</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {searchQuery 
                ? 'No matches found' 
                : statusFilter !== 'all' 
                ? `No ${statusFilter} games` 
                : viewMode === 'today' 
                ? 'No games today' 
                : viewMode === 'cfp'
                ? 'CFP games coming soon!'
                : 'No games this week'}
            </h3>
            <p className="text-slate-500 mb-6 max-w-xs mx-auto">
              {searchQuery 
                ? 'Try a different search term'
                : statusFilter !== 'all'
                ? 'Try viewing all games instead'
                : viewMode === 'today'
                ? 'Check back on game day for live scores'
                : 'The schedule will be updated soon'}
            </p>
            {(searchQuery || statusFilter !== 'all') && (
              <Button 
                onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                variant="outline"
              >
                Clear Filters
              </Button>
            )}
            {viewMode === 'today' && !searchQuery && statusFilter === 'all' && (
              <Button onClick={() => setViewMode('week')} className="gd-btn-primary">
                View This Week's Games
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Results summary */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">{displayGames.length}</span>
                {' '}{displayGames.length === 1 ? 'game' : 'games'}
                {statusFilter !== 'all' && ` • ${statusFilter}`}
              </p>
              {statusFilter !== 'all' && (
                <button 
                  onClick={() => setStatusFilter('all')}
                  className="text-xs text-orange-500 font-semibold flex items-center gap-1 hover:text-orange-600"
                >
                  <X className="w-3 h-3" />
                  Clear filter
                </button>
              )}
            </div>

            {/* Games grouped by date */}
            {gamesByDate.map(([date, dateGames]) => (
              <div key={date} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <h3 className="font-semibold text-slate-700">{date}</h3>
                  <Badge variant="outline" className="text-xs">
                    {dateGames.length} {dateGames.length === 1 ? 'game' : 'games'}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {dateGames.map((game) => (
                    <GameCard key={game.id} game={game} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <SafetyButton />
      
      <AuthModal 
        open={showAuthModal} 
        onOpenChange={setShowAuthModal}
        onSuccess={handleAuthSuccess}
        feature="RSVP to tailgates"
      />

      <TeamDetailView
        team={viewingTeam}
        isOpen={!!viewingTeam}
        onClose={() => setViewingTeam(null)}
        onArticleClick={(article) => setViewingArticle(article)}
      />

      <ArticleView
        article={viewingArticle}
        isOpen={!!viewingArticle}
        onClose={() => setViewingArticle(null)}
      />
    </div>
  );
}
