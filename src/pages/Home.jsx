import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '@/api/client';
import { fetchScoreboard } from '@/lib/sportsApi';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { format, parseISO, isToday, startOfToday } from 'date-fns';
import { 
  Users, MapPin, Car, Calendar, PartyPopper, 
  Navigation, Shield, ChevronRight, Bell, Menu, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import WeatherWidget from '@/components/common/WeatherWidget';
import GameCard from '@/components/common/GameCard';
import QuickAction from '@/components/common/QuickAction';
import TailgateCard from '@/components/common/TailgateCard';
import FriendCard from '@/components/common/FriendCard';
import SafetyButton from '@/components/common/SafetyButton';
import GameDayAssistant from '@/components/ai/GameDayAssistant';
import AuthModal from '@/components/auth/AuthModal';
import TeamDetailView, { ArticleView } from '@/components/teams/TeamDetailView';
import { 
  Skeleton, 
  TailgateCardSkeleton, 
  GameCardSkeleton, 
  StoriesSkeleton,
} from '@/components/common/LoadingSkeleton';

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authFeature, setAuthFeature] = useState('');
  const [viewingTeam, setViewingTeam] = useState(null);
  const [viewingArticle, setViewingArticle] = useState(null);
  
  useEffect(() => {
    client.auth.me()
      .then(setUser)
      .catch(() => {})
      .finally(() => setUserLoading(false));
      
    // Listen for login prompts from other components
    const handleShowLogin = () => setShowAuthModal(true);
    window.addEventListener('gameday:showLogin', handleShowLogin);
    return () => window.removeEventListener('gameday:showLogin', handleShowLogin);
  }, []);
  
  const requireAuth = (feature, callback) => {
    if (!user) {
      setAuthFeature(feature);
      setShowAuthModal(true);
    } else {
      callback();
    }
  };
  
  const handleAuthSuccess = (loggedInUser) => {
    setUser(loggedInUser);
  };
  
  // Fetch live/upcoming games from ESPN
  const { data: allGames = [], isLoading: gamesLoading } = useQuery({
    queryKey: ['home-games'],
    queryFn: fetchScoreboard,
    staleTime: 30000,
  });
  
  // Filter to show upcoming and live games first
  const games = allGames.filter(g => g.status === 'upcoming' || g.status === 'live').slice(0, 5);
  
  // Fetch public tailgates
  const { data: tailgates = [], isLoading: tailgatesLoading } = useQuery({
    queryKey: ['tailgates'],
    // Soonest upcoming public tailgates first (past ones are hidden)
    queryFn: async () => {
      const all = await client.entities.Tailgate.filter({ is_public: true });
      const today = startOfToday();
      return all
        .filter(t => !t.game_date || parseISO(t.game_date) >= today)
        .sort((a, b) => (a.game_date || '9999').localeCompare(b.game_date || '9999'))
        .slice(0, 4);
    },
  });
  
  // Fetch user's groups
  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ['groups', user?.email],
    queryFn: () => user ? client.entities.TailgateGroup.filter({ 'members.email': user.email }) : [],
    enabled: !!user,
  });
  
  const nextGame = games[0];

  // Tailgate dates are stored as "YYYY-MM-DD"; parse them as local dates
  // (new Date('2025-09-06') is UTC midnight, which shows the previous day in US time zones).
  const tailgateDate = (t) => (t?.game_date ? parseISO(t.game_date) : null);
  const featuredDate = tailgateDate(tailgates[0]);
  const featuredLabel = featuredDate && isToday(featuredDate) ? 'Today' : 'Next Up';
  
  const quickActions = [
    { icon: Users, label: 'Find Friends', color: 'orange', onClick: () => requireAuth('friend tracking', () => navigate(createPageUrl('FindFriends'))) },
    { icon: Car, label: 'Find My Car', color: 'blue', onClick: () => requireAuth('car location', () => navigate(createPageUrl('CarLocator'))) },
    { icon: PartyPopper, label: 'Tailgates', color: 'green', onClick: () => navigate(createPageUrl('TailgateDirectory')) },
    { icon: MapPin, label: 'Campus Map', color: 'purple', onClick: () => navigate(createPageUrl('CampusMap')) },
    { icon: Star, label: 'Discover', color: 'yellow', onClick: () => navigate(createPageUrl('DiscoverTeams')) },
  ];
  
  return (
    <div className="gd-page !pb-24">
      {/* Header */}
      <div className="gd-header px-4 pt-12 pb-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏈</span>
            <h1 className="text-2xl font-bold">GameDay</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 hover:bg-white/20 rounded-full transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full" />
            </button>
            <button 
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              onClick={() => navigate(createPageUrl('Settings'))}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Instagram-style Stories - Groups */}
      {user && (
        <div className="px-4 py-4 border-b border-gray-100 overflow-x-auto">
          {groupsLoading ? (
            <StoriesSkeleton count={4} />
          ) : groups.length > 0 ? (
            <div className="flex gap-4">
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => navigate(createPageUrl('FindFriends') + `?group=${group.id}`)}
                  className="flex flex-col items-center gap-2 shrink-0"
                >
                  <div className="relative">
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center text-2xl border-2 border-gray-200"
                      style={{ backgroundColor: group.color || '#FF6B35' }}
                    >
                      {group.avatar_emoji || '🏈'}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white">
                      {group.members?.filter(m => m.location_sharing)?.length || 0}
                    </div>
                  </div>
                  <span className="text-xs max-w-[64px] truncate">{group.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm">No groups yet</p>
              <button 
                className="text-orange-500 text-sm font-medium mt-1"
                onClick={() => navigate(createPageUrl('FindFriends'))}
              >
                Create one →
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Quick Actions - Ticketmaster style */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-5 gap-2">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={action.onClick}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 active:scale-95 transition-transform"
            >
              <action.icon className="w-6 h-6" />
              <span className="text-[10px] font-medium text-center leading-tight">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Next Game - Ticketmaster Hero */}
      {gamesLoading ? (
        <div className="mx-4 mb-4">
          <Skeleton className="h-48 w-full rounded-3xl" />
        </div>
      ) : nextGame ? (
        <div className="mx-4 mb-4">
          <div className="relative h-48 rounded-3xl overflow-hidden shadow-lg">
            <div className={`absolute inset-0 ${
              nextGame.status === 'live' 
                ? 'bg-gradient-to-br from-red-600 via-orange-600 to-yellow-500' 
                : 'bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600'
            }`} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end p-5">
              <div className="flex items-center gap-2 mb-1">
                {nextGame.status === 'live' ? (
                  <span className="flex items-center gap-1 text-white text-sm font-bold bg-red-500 px-2 py-0.5 rounded-full">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    LIVE NOW
                  </span>
                ) : (
                  <p className="text-white/80 text-sm font-medium">NEXT GAME</p>
                )}
              </div>
              <h2 className="text-white text-xl font-bold mb-1">
                <button 
                  className="hover:underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewingTeam({ id: nextGame.away_team_id, name: nextGame.away_team });
                  }}
                >
                  {nextGame.away_team}
                </button>
                {' @ '}
                <button 
                  className="hover:underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewingTeam({ id: nextGame.home_team_id, name: nextGame.home_team });
                  }}
                >
                  {nextGame.home_team}
                </button>
              </h2>
              {nextGame.status === 'live' ? (
                <p className="text-white text-3xl font-bold mb-2">
                  {nextGame.away_score} - {nextGame.home_score}
                  <span className="text-white/80 text-sm ml-2">{nextGame.quarter} {nextGame.time_remaining}</span>
                </p>
              ) : (
                <div className="flex items-center gap-3 text-white/90 text-sm mb-2">
                  <span>📅 {nextGame.game_date}</span>
                  <span>⏰ {nextGame.game_time}</span>
                  {nextGame.tv_network && <span>📺 {nextGame.tv_network}</span>}
                </div>
              )}
              <button 
                className="mt-2 bg-white text-black font-bold py-3 px-6 rounded-full text-sm w-full"
                onClick={() => navigate(createPageUrl('GameDay'))}
              >
                {nextGame.status === 'live' ? 'Watch Live Scores' : 'View All Games'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      
      {/* Main Content */}
      <div className="px-4 space-y-6 pb-24">
        {/* Featured Tailgates - Ticketmaster Style */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold">Tailgates</h2>
            <button 
              className="text-orange-500 text-sm font-semibold"
              onClick={() => navigate(createPageUrl('TailgateDirectory'))}
            >
              See All
            </button>
          </div>
          
          {tailgatesLoading ? (
            <div className="space-y-4">
              <TailgateCardSkeleton />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-48 rounded-2xl" />
                <Skeleton className="h-48 rounded-2xl" />
              </div>
            </div>
          ) : tailgates.length > 0 ? (
            <>
              {/* Today's Featured Tailgate */}
              {tailgates[0] && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-900 mb-2">{featuredLabel}</p>
                  <button
                    onClick={() => navigate(createPageUrl('TailgateDetail') + `?id=${tailgates[0].id}`)}
                    className="w-full bg-white rounded-2xl shadow-md overflow-hidden"
                  >
                    <div className="relative h-44">
                      {tailgates[0].photo_url ? (
                        <img src={tailgates[0].photo_url} alt={tailgates[0].name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400" />
                      )}
                      <div className="absolute top-3 left-3 bg-white rounded-xl px-3 py-2 shadow-lg">
                        <p className="text-2xl font-bold text-orange-600">{tailgateDate(tailgates[0]) ? format(tailgateDate(tailgates[0]), 'd') : '--'}</p>
                        <p className="text-xs font-semibold text-orange-600 uppercase">{tailgateDate(tailgates[0]) ? format(tailgateDate(tailgates[0]), 'MMM') : 'TBD'}</p>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold text-lg text-left">{tailgates[0].name}</h3>
                          <p className="text-sm text-gray-500 text-left">{tailgates[0].start_time || '8:30 pm'} - {tailgates[0].end_time || '11:00 pm'}</p>
                        </div>
                        <div className="flex items-center gap-1 text-orange-500 text-sm">
                          <MapPin className="w-4 h-4" />
                          <span>{tailgates[0].location?.lot_name || 'Location TBD'}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 border-2 border-white" />
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-red-600 border-2 border-white" />
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-teal-600 border-2 border-white" />
                          </div>
                          <span className="text-sm text-orange-500 font-medium">{tailgates[0].rsvp_count || 0} Attending</span>
                        </div>
                        <span className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-2 rounded-full font-semibold text-sm">
                          Join
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
              )}
              
              {/* Upcoming Tailgates */}
              {tailgates.length > 1 && (
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-2">Upcoming</p>
                  <div className="grid grid-cols-2 gap-3">
                    {tailgates.slice(1, 5).map((tailgate) => (
                      <button
                        key={tailgate.id}
                        onClick={() => navigate(createPageUrl('TailgateDetail') + `?id=${tailgate.id}`)}
                        className="bg-white rounded-2xl shadow-md overflow-hidden text-left"
                      >
                        <div className="relative h-32">
                          {tailgate.photo_url ? (
                            <img src={tailgate.photo_url} alt={tailgate.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400" />
                          )}
                          <div className="absolute top-2 left-2 bg-white rounded-lg px-2 py-1 shadow">
                            <p className="text-lg font-bold text-orange-600">{tailgateDate(tailgate) ? format(tailgateDate(tailgate), 'd') : '--'}</p>
                            <p className="text-[10px] font-semibold text-orange-600 uppercase leading-none">{tailgateDate(tailgate) ? format(tailgateDate(tailgate), 'MMM') : 'TBD'}</p>
                          </div>
                        </div>
                        <div className="p-3">
                          <h3 className="font-bold text-sm mb-1 truncate">{tailgate.name}</h3>
                          <p className="text-xs text-gray-500 mb-2">{tailgate.start_time || '8:30 pm'} - {tailgate.end_time || '11:00 pm'}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex -space-x-1.5">
                              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 border border-white" />
                              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-400 to-red-600 border border-white" />
                            </div>
                            <span className="text-xs text-gray-500">{tailgate.rsvp_count || 0}</span>
                            <div className="flex items-center gap-1 text-orange-500 text-xs">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate max-w-[4.5rem]">{tailgate.location?.lot_name || 'TBD'}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 border border-gray-200 rounded-3xl">
              <PartyPopper className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-3">No tailgates yet</p>
              <button 
                className="text-orange-500 font-semibold text-sm"
                onClick={() => navigate(createPageUrl('CreateTailgate'))}
              >
                Create the first one
              </button>
            </div>
          )}
        </section>
        
        {/* Upcoming Games - Ticketmaster List */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold">Schedule</h2>
            <button 
              className="text-orange-500 text-sm font-semibold"
              onClick={() => navigate(createPageUrl('Schedule'))}
            >
              View All
            </button>
          </div>
          {gamesLoading ? (
            <div className="space-y-3">
              <GameCardSkeleton />
              <GameCardSkeleton />
              <GameCardSkeleton />
            </div>
          ) : games.length > 0 ? (
            <div className="space-y-3">
              {games.slice(0, 3).map((game) => (
                <div key={game.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {game.status === 'live' && (
                          <span className="flex items-center gap-1 text-red-500 text-xs font-bold">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            LIVE
                          </span>
                        )}
                        <p className="text-sm text-gray-500">{game.game_date} • {game.game_time}</p>
                      </div>
                      <p className="font-bold text-lg">{game.away_team} @ {game.home_team}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {game.tv_network && `📺 ${game.tv_network}`}
                        {game.status === 'live' && ` • ${game.away_score} - ${game.home_score}`}
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      {game.home_logo ? (
                        <img src={game.home_logo} alt="" className="w-10 h-10 object-contain" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg">
                          🏈
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-gray-200 rounded-3xl">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No games scheduled today</p>
              <p className="text-sm text-gray-400 mt-1">Check back on game day!</p>
            </div>
          )}
        </section>
      </div>
      
      {/* Safety Button */}
      <SafetyButton />
      
      {/* AI Assistant */}
      <GameDayAssistant />

      {/* Auth Modal */}
      <AuthModal 
        open={showAuthModal} 
        onOpenChange={setShowAuthModal}
        onSuccess={handleAuthSuccess}
        feature={authFeature}
      />

      {/* Team Detail View */}
      <TeamDetailView
        team={viewingTeam}
        isOpen={!!viewingTeam}
        onClose={() => setViewingTeam(null)}
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
