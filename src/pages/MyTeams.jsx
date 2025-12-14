import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/lib/auth';
import { fetchScoreboard, fetchTeamSchedule, fetchTeamNews, fetchNews, POPULAR_TEAMS, CONFERENCES } from '@/lib/sportsApi';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Star, Plus, Trash2, Radio, Calendar, Search, X, Trophy, MapPin, Tv, ChevronRight, ExternalLink, Newspaper } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import SafetyButton from '@/components/common/SafetyButton';

export default function MyTeams() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTeam, setNewTeam] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [selectedConference, setSelectedConference] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTeamForSchedule, setSelectedTeamForSchedule] = useState(null);
  const [viewingTeam, setViewingTeam] = useState(null); // For in-app team detail view
  const [viewingArticle, setViewingArticle] = useState(null); // For full article view
  const [showNewsSection, setShowNewsSection] = useState(false); // Toggle news section
  const [teamDetailTab, setTeamDetailTab] = useState('schedule'); // 'schedule' or 'news'

  useEffect(() => {
    auth.me()
      .then(u => {
        setUser(u);
        setIsLoading(false);
      })
      .catch(() => {
        setUser(null);
        setIsLoading(false);
      });
  }, []);

  // Fetch live games from ESPN
  const { data: games = [], isLoading: gamesLoading } = useQuery({
    queryKey: ['live-scores'],
    queryFn: fetchScoreboard,
    refetchInterval: 60000,
  });

  // Get the fresh team data from POPULAR_TEAMS (in case user has old cached data)
  const getTeamData = (teamName) => {
    return POPULAR_TEAMS.find(t => t.name === teamName) || null;
  };
  
  // When showing schedule, always use fresh team ID from POPULAR_TEAMS
  const freshTeamData = selectedTeamForSchedule ? getTeamData(selectedTeamForSchedule.name) : null;
  const teamIdForSchedule = freshTeamData?.id || selectedTeamForSchedule?.id;

  // Fetch selected team's schedule (for calendar button)
  const { data: teamSchedule = [], isLoading: scheduleLoading } = useQuery({
    queryKey: ['team-schedule', teamIdForSchedule],
    queryFn: () => fetchTeamSchedule(teamIdForSchedule),
    enabled: !!teamIdForSchedule,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch viewing team's schedule (for team detail view)
  const { data: viewingTeamSchedule = [], isLoading: viewingScheduleLoading } = useQuery({
    queryKey: ['team-schedule', viewingTeam?.id],
    queryFn: () => fetchTeamSchedule(viewingTeam?.id),
    enabled: !!viewingTeam?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch viewing team's news
  const { data: viewingTeamNews = [], isLoading: newsLoading } = useQuery({
    queryKey: ['team-news', viewingTeam?.id],
    queryFn: () => fetchTeamNews(viewingTeam?.id, 5),
    enabled: !!viewingTeam?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch general college football news
  const { data: latestNews = [], isLoading: latestNewsLoading } = useQuery({
    queryKey: ['cfb-news'],
    queryFn: () => fetchNews(15),
    staleTime: 5 * 60 * 1000,
  });

  const favoriteTeams = user?.favorite_teams || [];
  
  // Get unique conferences from teams
  const conferenceList = ['all', ...new Set(POPULAR_TEAMS.map(t => t.conference).filter(Boolean))];
  
  // Filter popular teams based on search and conference
  const filteredTeams = POPULAR_TEAMS.filter(t => {
    const matchesSearch = !teamSearch.trim() || 
      t.name.toLowerCase().includes(teamSearch.toLowerCase()) ||
      t.abbreviation.toLowerCase().includes(teamSearch.toLowerCase()) ||
      t.conference?.toLowerCase().includes(teamSearch.toLowerCase());
    const matchesConference = selectedConference === 'all' || t.conference === selectedConference;
    return matchesSearch && matchesConference;
  });

  // Filter games for followed teams
  const myTeamsGames = games.filter(game =>
    favoriteTeams.some(team =>
      game.home_team?.toLowerCase().includes(team.toLowerCase()) ||
      game.away_team?.toLowerCase().includes(team.toLowerCase())
    )
  );

  const liveGames = myTeamsGames.filter(g => g.status === 'live');
  const upcomingGames = myTeamsGames.filter(g => g.status === 'upcoming');

  const addTeam = (teamName) => {
    if (!teamName.trim()) return;
    if (favoriteTeams.includes(teamName.trim())) {
      toast.error('Team already in favorites');
      return;
    }
    const newFavorites = [...favoriteTeams, teamName.trim()];
    auth.updateMe({ favorite_teams: newFavorites });
    setUser(prev => ({ ...prev, favorite_teams: newFavorites }));
    toast.success('Team added to favorites!');
    setShowAddDialog(false);
    setNewTeam('');
    setTeamSearch('');
    setSelectedConference('all');
  };

  const removeTeam = (teamName) => {
    const newFavorites = favoriteTeams.filter(t => t !== teamName);
    auth.updateMe({ favorite_teams: newFavorites });
    setUser(prev => ({ ...prev, favorite_teams: newFavorites }));
    toast.success('Team unfollowed');
  };

  if (isLoading) {
    return (
      <div className="gd-page flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }
  
  // Allow viewing even if not logged in
  const displayTeams = user ? favoriteTeams : [];

  return (
    <div className="gd-page">
      {/* Header */}
      <div className="gd-header px-4 pt-12 pb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => navigate(createPageUrl('Home'))}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">My Teams</h1>
            <p className="text-white/90 text-sm">Follow your favorite teams</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 flex items-center gap-1"
            onClick={() => setShowNewsSection(!showNewsSection)}
          >
            <Newspaper className="w-5 h-5" />
            News
          </Button>
        </div>
      </div>

      {/* Latest News Section (Collapsible) */}
      {showNewsSection && (
        <div className="px-4 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-orange-500" />
              Latest College Football News
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNewsSection(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {latestNewsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse bg-white h-20 rounded-xl" />
              ))}
            </div>
          ) : latestNews.length > 0 ? (
            <div className="space-y-3">
              {latestNews.slice(0, 5).map((article, idx) => (
                <button
                  key={article.id || idx}
                  className="w-full bg-white rounded-xl p-3 shadow-sm text-left hover:shadow-md transition-shadow"
                  onClick={() => setViewingArticle(article)}
                >
                  <div className="flex gap-3">
                    {article.image && (
                      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                        <img 
                          src={article.image} 
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-slate-900 text-sm line-clamp-2">
                        {article.headline}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {article.published 
                          ? new Date(article.published).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })
                          : 'ESPN'
                        }
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0 self-center" />
                  </div>
                </button>
              ))}
              
              {latestNews.length > 5 && (
                <button
                  className="w-full text-center text-sm text-orange-600 font-medium py-2 hover:underline"
                  onClick={() => {
                    // Show all news in a sheet
                    setViewingArticle({ showAll: true, articles: latestNews });
                  }}
                >
                  View All News ({latestNews.length} articles)
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-8 bg-white rounded-xl">
              <Newspaper className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500">No news available</p>
            </div>
          )}
        </div>
      )}

      {/* Favorite Teams */}
      <div className="px-4 py-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900">Following ({favoriteTeams.length})</h2>
            <Button
              size="sm"
              className="bg-orange-500 hover:bg-orange-600"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Team
            </Button>
          </div>

          {displayTeams.length > 0 ? (
            <div className="space-y-2">
              {displayTeams.map((team, idx) => {
                const popularTeam = POPULAR_TEAMS.find(t => t.name === team);
                const teamLogo = popularTeam?.id 
                  ? `https://a.espncdn.com/i/teamlogos/ncaa/500/${popularTeam.id}.png`
                  : null;
                
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                        {teamLogo ? (
                          <img 
                            src={teamLogo} 
                            alt={team} 
                            className="w-10 h-10 object-contain"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <span 
                          className={`text-xs font-bold text-orange-600 ${teamLogo ? 'hidden' : 'flex'}`}
                          style={{ display: teamLogo ? 'none' : 'flex' }}
                        >
                          {popularTeam?.abbreviation || team.slice(0, 3).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        {popularTeam?.id ? (
                          <button 
                            className="font-medium text-slate-900 hover:text-orange-600 hover:underline block text-left"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingTeam({ id: popularTeam.id, name: team, conference: popularTeam.conference });
                            }}
                          >
                            {team} <ExternalLink className="w-3 h-3 inline ml-1 opacity-50" />
                          </button>
                        ) : (
                          <span className="font-medium text-slate-900 block">{team}</span>
                        )}
                        {popularTeam?.conference && (
                          <Badge variant="outline" className="text-xs mt-0.5">
                            {popularTeam.conference}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedTeamForSchedule(popularTeam || { name: team, id: null })}
                        className="text-orange-600 hover:text-orange-700"
                      >
                        <Calendar className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTeam(team)}
                        className="text-slate-600 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : !user ? (
            <div className="text-center py-8">
              <Star className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 mb-2">Sign in to follow teams</p>
              <Button 
                className="bg-orange-500 hover:bg-orange-600"
                onClick={() => navigate(createPageUrl('UserProfile'))}
              >
                Sign In
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <Star className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 mb-2">No teams followed yet</p>
              <p className="text-sm text-slate-500">Add teams to see their games here</p>
            </div>
          )}
        </div>

        {/* Live Games */}
        {liveGames.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Radio className="w-5 h-5 text-red-500" />
              <h2 className="font-bold text-slate-900">Live Now</h2>
              <Badge className="bg-red-500 animate-pulse">
                {liveGames.length}
              </Badge>
            </div>
            <div className="space-y-3">
              {liveGames.map((game, idx) => (
                <div key={idx} className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-red-500">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-red-500">LIVE {game.quarter}</Badge>
                    {game.tv_network && <span className="text-xs text-slate-500">{game.tv_network}</span>}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {game.away_logo && <img src={game.away_logo} alt="" className="w-8 h-8" />}
                      <span className="font-semibold">{game.away_team}</span>
                    </div>
                    <span className="text-xl font-bold">{game.away_score}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      {game.home_logo && <img src={game.home_logo} alt="" className="w-8 h-8" />}
                      <span className="font-semibold">{game.home_team}</span>
                    </div>
                    <span className="text-xl font-bold">{game.home_score}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Games */}
        {upcomingGames.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-blue-500" />
              <h2 className="font-bold text-slate-900">Upcoming Games</h2>
            </div>
            <div className="space-y-3">
              {upcomingGames.map((game, idx) => (
                <div key={idx} className="bg-white rounded-xl shadow-sm p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600">{game.game_date} • {game.game_time}</span>
                    {game.tv_network && <Badge variant="outline">{game.tv_network}</Badge>}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {game.away_logo && <img src={game.away_logo} alt="" className="w-8 h-8" />}
                      <span className="font-semibold">{game.away_team}</span>
                    </div>
                    <span className="text-slate-400">-</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      {game.home_logo && <img src={game.home_logo} alt="" className="w-8 h-8" />}
                      <span className="font-semibold">{game.home_team}</span>
                    </div>
                    <span className="text-slate-400">-</span>
                  </div>
                  {game.venue && (
                    <p className="text-xs text-slate-500 mt-2">📍 {game.venue}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {displayTeams.length > 0 && myTeamsGames.length === 0 && !gamesLoading && (
          <div className="text-center py-12 bg-white rounded-2xl">
            <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-3">
              🏈
            </div>
            <p className="text-slate-600 mb-2">No games scheduled today</p>
            <p className="text-sm text-slate-500">Check the Schedule for upcoming games</p>
            <Button 
              className="mt-3 bg-orange-500 hover:bg-orange-600"
              onClick={() => navigate(createPageUrl('Schedule'))}
            >
              View Schedule
            </Button>
          </div>
        )}
      </div>

      {/* Add Team Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => {
        setShowAddDialog(open);
        if (!open) {
          setTeamSearch('');
          setSelectedConference('all');
        }
      }}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Favorite Team</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search teams or conferences..."
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Conference Filter */}
            <div className="flex flex-wrap gap-1.5">
              {conferenceList.map((conf) => (
                <Button
                  key={conf}
                  variant={selectedConference === conf ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedConference(conf)}
                  className={`text-xs h-7 px-2 ${
                    selectedConference === conf 
                      ? 'bg-orange-500 hover:bg-orange-600' 
                      : 'hover:bg-orange-50'
                  }`}
                >
                  {conf === 'all' ? 'All' : conf}
                </Button>
              ))}
            </div>

            {/* Results count */}
            <p className="text-xs text-slate-500">
              {filteredTeams.length} team{filteredTeams.length !== 1 ? 's' : ''} found
              {selectedConference !== 'all' && ` in ${selectedConference}`}
            </p>

            {/* Team List */}
            <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
              {filteredTeams.length > 0 ? (
                filteredTeams.map((team) => {
                  const isFollowed = displayTeams.includes(team.name);
                  return (
                    <button
                      key={`${team.id}-${team.name}`}
                      onClick={() => !isFollowed && addTeam(team.name)}
                      disabled={isFollowed}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                        isFollowed 
                          ? 'bg-green-50 text-green-700' 
                          : 'hover:bg-orange-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                          <img 
                            src={`https://a.espncdn.com/i/teamlogos/ncaa/500/${team.id}.png`}
                            alt={team.name} 
                            className="w-8 h-8 object-contain"
                          />
                        </div>
                        <div className="text-left">
                          <span className="font-medium block">{team.name}</span>
                          <span className="text-xs text-slate-500">{team.conference}</span>
                        </div>
                      </div>
                      {isFollowed ? (
                        <Badge className="bg-green-500">Following</Badge>
                      ) : (
                        <Plus className="w-5 h-5 text-orange-500" />
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <p>No teams found</p>
                  <p className="text-xs mt-1">Try a different search or conference</p>
                </div>
              )}
            </div>

            {/* Custom Team Input */}
            <div className="pt-3 border-t border-slate-200">
              <p className="text-xs text-slate-500 mb-2">Or enter a custom team name:</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Team name"
                  value={newTeam}
                  onChange={(e) => setNewTeam(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTeam(newTeam)}
                />
                <Button
                  className="bg-orange-500 hover:bg-orange-600"
                  onClick={() => addTeam(newTeam)}
                  disabled={!newTeam.trim()}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Team Schedule Sheet */}
      <Sheet open={!!selectedTeamForSchedule} onOpenChange={(open) => !open && setSelectedTeamForSchedule(null)}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                {teamIdForSchedule ? (
                  <img 
                    src={`https://a.espncdn.com/i/teamlogos/ncaa/500/${teamIdForSchedule}.png`}
                    alt={selectedTeamForSchedule?.name}
                    className="w-12 h-12 object-contain"
                  />
                ) : (
                  <span className="text-sm font-bold text-orange-600">
                    {freshTeamData?.abbreviation || selectedTeamForSchedule?.abbreviation || selectedTeamForSchedule?.name?.slice(0, 3).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <span className="block">{selectedTeamForSchedule?.name}</span>
                <span className="text-sm font-normal text-slate-500">
                  {freshTeamData?.conference || selectedTeamForSchedule?.conference} • {new Date().getFullYear()}-{(new Date().getFullYear() + 1).toString().slice(-2)} Season
                </span>
              </div>
            </SheetTitle>
          </SheetHeader>

          <div className="py-4 overflow-y-auto h-[calc(85vh-100px)]">
            {scheduleLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
              </div>
            ) : !teamIdForSchedule ? (
              <div className="text-center py-12 text-slate-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>Schedule not available for this team</p>
                <p className="text-sm mt-1">Try removing and re-adding this team from the list</p>
              </div>
            ) : teamSchedule.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No games found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Season Record Summary */}
                {(() => {
                  const wins = teamSchedule.filter(g => g.result?.won).length;
                  const losses = teamSchedule.filter(g => g.result && !g.result.won).length;
                  const upcoming = teamSchedule.filter(g => g.status === 'upcoming').length;
                  return (
                    <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-4 mb-4 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white/80 text-sm">Season Record</p>
                          <p className="text-3xl font-bold">{wins} - {losses}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white/80 text-sm">Remaining</p>
                          <p className="text-2xl font-bold">{upcoming} games</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Game List */}
                {teamSchedule.map((game, idx) => (
                  <div 
                    key={game.id || idx} 
                    className={`p-4 rounded-xl border ${
                      game.status === 'live' 
                        ? 'border-red-300 bg-red-50' 
                        : game.result?.won 
                          ? 'border-green-200 bg-green-50' 
                          : game.result && !game.result.won 
                            ? 'border-red-200 bg-red-50/50' 
                            : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Week number */}
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600">
                          {game.week}
                        </div>
                        
                        {/* Opponent info */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                            <img 
                              src={game.opponent_logo || `https://a.espncdn.com/i/teamlogos/ncaa/500/${game.opponent_id || '0'}.png`}
                              alt={game.opponent} 
                              className="w-8 h-8 object-contain"
                              onError={(e) => {
                                e.target.src = 'https://a.espncdn.com/i/teamlogos/ncaa/500/default-team-logo-500.png';
                              }}
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900">
                                {game.is_home ? 'vs' : '@'} {game.opponent_rank && <span className="text-orange-500">#{game.opponent_rank}</span>}{' '}
                                {game.opponent_id ? (
                                  <button 
                                    className="hover:text-orange-600 hover:underline text-left"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setViewingTeam({ id: game.opponent_id, name: game.opponent });
                                    }}
                                  >
                                    {game.opponent}
                                  </button>
                                ) : (
                                  game.opponent
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span>{game.game_date}</span>
                              {game.status === 'upcoming' && <span>• {game.time}</span>}
                              {game.tv_network && (
                                <>
                                  <Tv className="w-3 h-3" />
                                  <span>{game.tv_network}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Result/Status */}
                      <div className="text-right">
                        {game.status === 'live' ? (
                          <Badge className="bg-red-500 animate-pulse">LIVE</Badge>
                        ) : game.result ? (
                          <div>
                            <Badge className={game.result.won ? 'bg-green-500' : 'bg-red-500'}>
                              {game.result.won ? 'W' : 'L'}
                            </Badge>
                            <p className="text-sm font-semibold mt-1">
                              {game.result.team_score} - {game.result.opponent_score}
                            </p>
                          </div>
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* In-App Team Detail View */}
      <Sheet open={!!viewingTeam} onOpenChange={(open) => {
        if (!open) {
          setViewingTeam(null);
          setTeamDetailTab('schedule'); // Reset to schedule tab when closing
        }
      }}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl overflow-hidden flex flex-col">
          {/* Header */}
          <SheetHeader className="pb-4 border-b flex-shrink-0">
            <SheetTitle className="flex items-center gap-4">
              {viewingTeam?.id && (
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                  <img 
                    src={`https://a.espncdn.com/i/teamlogos/ncaa/500/${viewingTeam.id}.png`}
                    alt={viewingTeam?.name}
                    className="w-14 h-14 object-contain"
                  />
                </div>
              )}
              <div className="flex-1">
                <span className="block text-xl">{viewingTeam?.name}</span>
                <div className="flex items-center gap-2 mt-1">
                  {viewingTeam?.conference && (
                    <Badge variant="outline" className="text-xs">{viewingTeam.conference}</Badge>
                  )}
                  {!viewingScheduleLoading && viewingTeamSchedule.length > 0 && (
                    <Badge className="bg-green-500 text-xs">
                      {viewingTeamSchedule.filter(g => g.result?.won).length}-{viewingTeamSchedule.filter(g => g.result && !g.result.won).length}
                    </Badge>
                  )}
                </div>
              </div>
            </SheetTitle>
          </SheetHeader>
          
          {/* Tab Navigation */}
          <div className="flex gap-2 pt-4 pb-2 border-b flex-shrink-0">
            <button
              onClick={() => setTeamDetailTab('schedule')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors ${
                teamDetailTab === 'schedule'
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Calendar className="w-5 h-5" />
              Schedule
            </button>
            <button
              onClick={() => setTeamDetailTab('news')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors ${
                teamDetailTab === 'news'
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Newspaper className="w-5 h-5" />
              News
              {viewingTeamNews.length > 0 && (
                <Badge className="bg-white/20 text-xs px-1.5">{viewingTeamNews.length}</Badge>
              )}
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto py-4 space-y-6">
            {viewingScheduleLoading || newsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
              </div>
            ) : teamDetailTab === 'schedule' ? (
              <>
                {/* Season Record Summary */}
                {viewingTeamSchedule.length > 0 && (
                  <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-4 text-white">
                    <h3 className="text-sm font-medium opacity-90 mb-2">{new Date().getFullYear()} Season</h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-3xl font-bold">{viewingTeamSchedule.filter(g => g.result?.won).length}</p>
                        <p className="text-xs opacity-80">Wins</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold">{viewingTeamSchedule.filter(g => g.result && !g.result.won).length}</p>
                        <p className="text-xs opacity-80">Losses</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold">{viewingTeamSchedule.filter(g => g.status === 'upcoming').length}</p>
                        <p className="text-xs opacity-80">Remaining</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recent/Upcoming Games */}
                <div>
                  <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-orange-500" />
                    Schedule
                  </h3>
                  
                  {viewingTeamSchedule.length > 0 ? (
                    <div className="space-y-2">
                      {viewingTeamSchedule.map((game, idx) => {
                        const isWin = game.result?.won === true;
                        const isLoss = game.result && !game.result.won;
                        const isLive = game.status === 'live';
                        
                        return (
                          <div
                            key={game.id || idx}
                            className={`flex items-center gap-3 p-3 rounded-xl border ${
                              isWin ? 'border-green-200 bg-green-50' :
                              isLoss ? 'border-red-200 bg-red-50' :
                              isLive ? 'border-red-300 bg-red-50' :
                              'border-slate-200 bg-white'
                            }`}
                          >
                            {/* Opponent Logo */}
                            <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                              <img 
                                src={game.opponent_logo || `https://a.espncdn.com/i/teamlogos/ncaa/500/${game.opponent_id || '0'}.png`}
                                alt={game.opponent} 
                                className="w-8 h-8 object-contain"
                              />
                            </div>
                            
                            {/* Game Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-slate-500">{game.is_home ? 'vs' : '@'}</span>
                                {game.opponent_rank && (
                                  <span className="text-xs font-bold text-orange-500">#{game.opponent_rank}</span>
                                )}
                                <span className="font-medium text-slate-900 truncate">{game.opponent}</span>
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                {game.game_date}
                                {game.status === 'upcoming' && ` • ${game.time}`}
                                {game.tv_network && ` • ${game.tv_network}`}
                              </div>
                            </div>
                            
                            {/* Result */}
                            <div className="text-right flex-shrink-0">
                              {isLive ? (
                                <Badge className="bg-red-500 animate-pulse">LIVE</Badge>
                              ) : game.result ? (
                                <div className="text-right">
                                  <Badge className={`${isWin ? 'bg-green-500' : 'bg-red-500'} mb-1`}>
                                    {isWin ? 'W' : 'L'}
                                  </Badge>
                                  <p className="text-sm font-bold text-slate-700">
                                    {game.result.team_score}-{game.result.opponent_score}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">Upcoming</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-slate-50 rounded-xl">
                      <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500">No schedule available</p>
                    </div>
                  )}
                </div>

                {/* Follow Button */}
                {viewingTeam && !favoriteTeams.includes(viewingTeam.name) && (
                  <Button
                    className="w-full bg-orange-500 hover:bg-orange-600"
                    onClick={() => {
                      addTeam(viewingTeam.name);
                      setViewingTeam(null);
                    }}
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Follow {viewingTeam.name}
                  </Button>
                )}
              </>
            ) : (
              /* News Tab Content */
              <>
                {viewingTeamNews.length > 0 ? (
                  <div className="space-y-3">
                    {viewingTeamNews.map((article, idx) => (
                      <button
                        key={article.id || idx}
                        className="w-full bg-white border border-slate-200 rounded-xl overflow-hidden text-left hover:bg-slate-50 hover:border-orange-200 transition-colors"
                        onClick={() => setViewingArticle(article)}
                      >
                        <div className="flex gap-3 p-3">
                          {article.image && (
                            <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                              <img 
                                src={article.image} 
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-slate-900 text-sm line-clamp-2 mb-1">
                              {article.headline}
                            </h4>
                            {article.description && (
                              <p className="text-xs text-slate-500 line-clamp-2 mb-2">
                                {article.description}
                              </p>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-400">
                                {article.publishedFormatted || article.source}
                              </span>
                              <ChevronRight className="w-4 h-4 text-orange-500" />
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-slate-50 rounded-xl">
                    <Newspaper className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">No news available</p>
                    <p className="text-sm text-slate-500 mt-1">Check back later for updates on {viewingTeam?.name}</p>
                  </div>
                )}

                {/* Follow Button */}
                {viewingTeam && !favoriteTeams.includes(viewingTeam.name) && (
                  <Button
                    className="w-full bg-orange-500 hover:bg-orange-600"
                    onClick={() => {
                      addTeam(viewingTeam.name);
                      setViewingTeam(null);
                    }}
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Follow {viewingTeam.name}
                  </Button>
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Full Article View */}
      <Sheet open={!!viewingArticle} onOpenChange={(open) => !open && setViewingArticle(null)}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl overflow-hidden flex flex-col">
          <SheetHeader className="pb-4 border-b flex-shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-orange-500" />
              {viewingArticle?.showAll ? 'All News' : 'Article'}
            </SheetTitle>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto py-4">
            {viewingArticle?.showAll ? (
              // Show all articles list
              <div className="space-y-3">
                {viewingArticle.articles?.map((article, idx) => (
                  <button
                    key={article.id || idx}
                    className="w-full bg-white rounded-xl p-3 border border-slate-200 text-left hover:bg-slate-50 transition-colors"
                    onClick={() => setViewingArticle(article)}
                  >
                    <div className="flex gap-3">
                      {article.image && (
                        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                          <img 
                            src={article.image} 
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-slate-900 text-sm line-clamp-2 mb-1">
                          {article.headline}
                        </h3>
                        {article.description && (
                          <p className="text-xs text-slate-500 line-clamp-2">
                            {article.description}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 mt-1">
                          {article.published 
                            ? new Date(article.published).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })
                            : 'ESPN'
                          }
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0 self-center" />
                    </div>
                  </button>
                ))}
              </div>
            ) : viewingArticle ? (
              // Show single article
              <div className="space-y-4">
                {/* Article Image */}
                {viewingArticle.image && (
                  <div className="w-full aspect-video rounded-2xl overflow-hidden bg-slate-100">
                    <img 
                      src={viewingArticle.image} 
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                {/* Headline */}
                <h1 className="text-xl font-bold text-slate-900 leading-tight">
                  {viewingArticle.headline}
                </h1>
                
                {/* Meta info */}
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <span className="font-medium text-orange-600">{viewingArticle.source || 'ESPN'}</span>
                  <span>•</span>
                  <span>
                    {viewingArticle.published 
                      ? new Date(viewingArticle.published).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      : 'Recent'
                    }
                  </span>
                </div>
                
                {/* Description/Summary */}
                {viewingArticle.description && (
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-slate-700 leading-relaxed">
                      {viewingArticle.description}
                    </p>
                  </div>
                )}
                
                {/* Read Full Article Button */}
                {viewingArticle.link && (
                  <a
                    href={viewingArticle.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full p-4 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors"
                  >
                    <ExternalLink className="w-5 h-5" />
                    Read Full Article on ESPN
                  </a>
                )}
                
                {/* Back to all news */}
                {latestNews.length > 0 && (
                  <button
                    className="w-full text-center text-sm text-slate-500 py-2 hover:text-orange-600"
                    onClick={() => setViewingArticle({ showAll: true, articles: latestNews })}
                  >
                    ← Back to All News
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <SafetyButton />
    </div>
  );
}