import React, { useState, useEffect } from 'react';
import { getGuestTeams, mergeGuestTeams } from '@/lib/favorites';
import { TailgateIcon } from '@/components/icons/GameDayIcons';
import { useNavigate } from 'react-router-dom';
import { client } from '@/api/client';
import { fetchScoreboard, fetchStories, teamLogoUrl } from '@/lib/sportsApi';
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
import GameDayAssistant from '@/components/ai/GameDayAssistant';
import AuthModal from '@/components/auth/AuthModal';
import TeamDetailView, { ArticleView } from '@/components/teams/TeamDetailView';
import { 
  Skeleton, 
  TailgateCardSkeleton, 
  GameCardSkeleton, 
  StoriesSkeleton,
} from '@/components/common/LoadingSkeleton';
import VideoHighlights from '@/components/video/VideoHighlights';
import VideoStorySheet from '@/components/video/VideoStorySheet';
import TeamsRow from '@/components/home/TeamsRow';
import GreetingCard from '@/components/home/GreetingCard';
import Essentials from '@/components/home/Essentials';
import AppHeader from '@/components/layout/AppHeader';
import FeaturedGame from '@/components/scores/FeaturedGame';
import ScoresCarousel from '@/components/home/ScoresCarousel';
import StoryCard from '@/components/home/StoryCard';
import TopHeadlines from '@/components/home/TopHeadlines';
import { fetchVideoNews, findTeamId, findTeam } from '@/lib/sportsApi';

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authFeature, setAuthFeature] = useState('');
  const [viewingTeam, setViewingTeam] = useState(null);
  const [viewingArticle, setViewingArticle] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState(null); // null = All

  // Tuck the teams row away once you scroll into the feed; bring it back at the top
  const [teamsRowHidden, setTeamsRowHidden] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setTeamsRowHidden(prev => (prev ? y > 8 : y > 72)); // hysteresis avoids flicker
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const [openStory, setOpenStory] = useState(null);
  
  useEffect(() => {
    client.auth.me()
      .then(mergeGuestTeams)
      .then(setUser)
      .catch(() => {})
      .finally(() => setUserLoading(false));
      
    // Listen for login prompts from other components
    const handleShowLogin = () => setShowAuthModal(true);
    window.addEventListener('gameday:showLogin', handleShowLogin);
    // The account finished syncing at startup (teams, settings): use the fresh copy
    const handleUser = (e) => { if (e.detail) setUser(e.detail); };
    window.addEventListener('gameday:user', handleUser);
    return () => {
      window.removeEventListener('gameday:showLogin', handleShowLogin);
      window.removeEventListener('gameday:user', handleUser);
    };
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
    mergeGuestTeams(loggedInUser).then(setUser);
  };
  
  // Fetch live/upcoming games from ESPN
  const { data: allGames = [], isLoading: gamesLoading } = useQuery({
    queryKey: ['home-games'],
    queryFn: fetchScoreboard,
    staleTime: 30000,
  });
  
  // Score cards: live first, then upcoming, then finals; filtered to the selected team
  const statusOrder = { live: 0, upcoming: 1, final: 2 };
  const scoreGames = allGames
    .filter(g => !selectedTeamId || g.home_team_id === selectedTeamId || g.away_team_id === selectedTeamId)
    .slice()
    .sort((a, b) => (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3))
    .slice(0, 12);

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
  
  // Followed teams for the top row (names in the profile -> ESPN ids + logos)
  const favoriteTeams = user ? (user.favorite_teams || []) : (userLoading ? [] : getGuestTeams());
  const { data: followedTeams = [] } = useQuery({
    queryKey: ['followed-teams', favoriteTeams.join('|')],
    queryFn: async () => {
      const teams = await Promise.all(favoriteTeams.map(findTeam));
      // Every followed team gets a tile; if ESPN can't be reached or the name
      // doesn't match, show it with initials instead of dropping it.
      return favoriteTeams.map((name, i) => (teams[i] ? {
        id: String(teams[i].id),
        name,
        short: teams[i].location || teams[i].shortDisplayName || name, // "Alabama", "Miami"
        logo: teamLogoUrl(teams[i].id),
      } : { id: `name:${name}`, name, short: name.split(' ')[0], logo: null, unresolved: true }));
    },
    enabled: favoriteTeams.length > 0,
    placeholderData: () => favoriteTeams.map(name => ({ id: `name:${name}`, name, short: name.split(' ')[0], logo: null, unresolved: true })),
  });
  const selectedTeam = followedTeams.find(t => t.id === selectedTeamId) || null;

  // Story feed (all college football, or the selected team)
  const { data: stories = [], isLoading: storiesLoading } = useQuery({
    queryKey: ['home-stories', selectedTeamId || 'all'],
    queryFn: () => fetchStories({ teamId: selectedTeamId, limit: 40 }),
    staleTime: 120000,
  });
  const cardStories = stories.filter(st => st.image).slice(0, 7);
  const cardIds = new Set(cardStories.map(st => st.id));
  const headlineStories = stories.filter(st => !cardIds.has(st.id)).slice(0, 7);

  // Video highlights row: selected team, else favorite teams first, then everything
  const { data: highlights = [], isLoading: highlightsLoading } = useQuery({
    queryKey: ['home-highlights', selectedTeamId || favoriteTeams.slice(0, 2).join('|')],
    queryFn: async () => {
      const teamIds = selectedTeamId
        ? [selectedTeamId]
        : (await Promise.all(favoriteTeams.slice(0, 2).map(findTeamId))).filter(Boolean);
      const lists = await Promise.all([
        ...teamIds.map(teamId => fetchVideoNews({ teamId, limit: 25 })),
        ...(selectedTeamId ? [] : [fetchVideoNews({ limit: 50 })]),
      ]);
      const seen = new Set();
      return lists.flat().filter(v => (seen.has(v.url) ? false : seen.add(v.url))).slice(0, 10);
    },
    staleTime: 300000,
  });

  // Tailgate dates are stored as "YYYY-MM-DD"; parse them as local dates
  // (new Date('2025-09-06') is UTC midnight, which shows the previous day in US time zones).
  const tailgateDate = (t) => (t?.game_date ? parseISO(t.game_date) : null);
  const featuredDate = tailgateDate(tailgates[0]);
  const featuredLabel = featuredDate && isToday(featuredDate) ? 'Today' : 'Next Up';
  
  // Featured game: your team's live/next game, else the best-ranked one
  const isFavGame = (g) => favoriteTeams.some(t => [g.home_team, g.away_team].some(n => n?.toLowerCase() === t.toLowerCase()));
  const rankScore = (g) => Math.min(g.home_rank || 99, g.away_rank || 99) + (g.home_rank && g.away_rank ? -10 : 0);
  const featuredGame = (() => {
    const pool = selectedTeamId ? scoreGames : allGames;
    const fav = pool.filter(isFavGame);
    // Your team: its live game, else its next kickoff
    const mine = fav.find(g => g.status === 'live')
      || fav.filter(g => g.status === 'upcoming').sort((a, b) => new Date(a.full_date) - new Date(b.full_date))[0];
    if (mine) return mine;
    // Otherwise the biggest matchup: best-ranked live game, else best-ranked upcoming (earliest breaks ties)
    const byRank = (a, b) => rankScore(a) - rankScore(b) || new Date(a.full_date) - new Date(b.full_date);
    return pool.filter(g => g.status === 'live').sort(byRank)[0]
      || pool.filter(g => g.status === 'upcoming').sort(byRank)[0]
      || null;
  })();
  const featuredIsMine = featuredGame && isFavGame(featuredGame);

  // Essentials status lines (real data)
  const { data: lastCar } = useQuery({
    queryKey: ['home-last-car', user?.email],
    queryFn: async () => (await client.entities.CarLocation.filter({ user_email: user.email }, '-created_date', 1))[0] || null,
    enabled: !!user,
  });
  const openEssential = (id) => {
    if (id === 'car') return requireAuth('car location', () => navigate(createPageUrl('CarLocator')));
    if (id === 'friends') return requireAuth('friend tracking', () => navigate(createPageUrl('FindFriends')));
    if (id === 'tailgates') return navigate(createPageUrl('TailgateDirectory'));
    return navigate(createPageUrl('CampusMap'));
  };

  return (
    <div className="gd-page !pb-24">
      {/* Header with followed-teams row */}
      <AppHeader eyebrow="Saturday Live" title="GameDay" childrenHidden={teamsRowHidden}>
        <TeamsRow
          teams={followedTeams}
          selectedId={selectedTeamId}
          onSelect={setSelectedTeamId}
          onEdit={() => navigate(createPageUrl('DiscoverTeams'))}
        />
      </AppHeader>

      {/* Greeting + weather, and the featured game */}
      <div className="space-y-4 px-4 pt-4">
        <GreetingCard user={user} nextGame={featuredIsMine ? featuredGame : null} />
        {featuredGame && (
          <section aria-labelledby="featured-game">
            <h2 id="featured-game" className="mb-3 font-display text-lg font-bold uppercase tracking-wide text-on-surface">
              {featuredIsMine ? 'Your next game' : featuredGame.status === 'live' ? 'Game of the moment' : 'Game of the week'}
            </h2>
            <FeaturedGame
              game={featuredGame}
              onOpen={(g) => navigate(createPageUrl('LiveGame') + `?gameId=${g.id}&home=${encodeURIComponent(g.home_team)}&away=${encodeURIComponent(g.away_team)}`)}
            />
          </section>
        )}
      </div>

      {/* Instagram-style Stories - Groups */}
      {user && (groupsLoading || groups.length > 0) && (
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
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-surface-container flex items-center justify-center text-xs font-bold text-white">
                      {group.members?.filter(m => m.location_sharing)?.length || 0}
                    </div>
                  </div>
                  <span className="text-xs max-w-[64px] truncate">{group.name}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}
      
      {/* Scores */}
      <section aria-labelledby="home-scores" className="px-4 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 id="home-scores" className="text-base font-bold text-slate-700">
            {selectedTeam ? `${selectedTeam.name} games` : 'College Football'}
          </h2>
          <button className="text-orange-500 text-sm font-semibold" onClick={() => navigate(createPageUrl('GameDay'))}>
            All scores
          </button>
        </div>
        {gamesLoading ? (
          <div className="-mx-4 flex gap-3 overflow-hidden px-4">
            {[1, 2].map(i => <Skeleton key={i} className="h-28 w-52 shrink-0 rounded-2xl" />)}
          </div>
        ) : scoreGames.length > 0 ? (
          <ScoresCarousel
            games={scoreGames}
            onOpen={(game) => navigate(createPageUrl('LiveGame') + `?gameId=${game.id}&home=${encodeURIComponent(game.home_team)}&away=${encodeURIComponent(game.away_team)}`)}
          />
        ) : (
          <p className="rounded-2xl border border-outline-variant bg-surface-container px-4 py-5 text-sm text-slate-500">
            {selectedTeam ? `No ${selectedTeam.name} game this week.` : 'No games this week.'}
          </p>
        )}
      </section>

      {/* Game day essentials */}
      <div className="px-4 py-4">
        <Essentials
          carLabel={lastCar ? (lastCar.lot_name || lastCar.notes || 'Spot saved') : null}
          crewLabel={user ? (groups.length ? `${groups.length} ${groups.length === 1 ? 'group' : 'groups'} · share your location` : 'Create or join a group') : null}
          tailgateLabel={tailgates.length ? `${tailgates.length}${tailgates.length >= 4 ? '+' : ''} upcoming near game day` : null}
          onOpen={openEssential}
        />
      </div>

      {/* Main Content */}
      <div className="px-4 space-y-6 pb-24">
        {/* Story feed: stories open in the app; videos/articles play/read on ESPN */}
        <section aria-label="Stories" className="space-y-4">
          {storiesLoading ? (
            [1, 2].map(i => <Skeleton key={i} className="h-96 w-full rounded-2xl" />)
          ) : cardStories.length === 0 ? (
            <p className="rounded-2xl border border-outline-variant bg-surface-container px-4 py-8 text-center text-sm text-slate-500">
              No stories right now. Check back soon.
            </p>
          ) : (
            <>
              {cardStories.slice(0, 2).map(story => (
                <StoryCard key={story.id} story={story} onOpen={setOpenStory} />
              ))}

              {(highlightsLoading || highlights.length > 0) && (
                <section aria-labelledby="home-highlights" className="pt-2">
                  <div className="flex items-center justify-between mb-3">
                    <h2 id="home-highlights" className="text-xl font-bold">Highlights</h2>
                    <button
                      className="text-orange-500 text-sm font-semibold"
                      onClick={() => navigate(createPageUrl('News') + '?filter=videos')}
                    >
                      See All
                    </button>
                  </div>
                  <VideoHighlights videos={highlights} isLoading={highlightsLoading} layout="rail" />
                </section>
              )}

              {cardStories.slice(2, 3).map(story => (
                <StoryCard key={story.id} story={story} onOpen={setOpenStory} />
              ))}

              <TopHeadlines stories={headlineStories} onOpen={setOpenStory} />

              {cardStories.slice(3).map(story => (
                <StoryCard key={story.id} story={story} onOpen={setOpenStory} />
              ))}

              <button
                className="w-full rounded-full border border-outline-variant bg-surface-container py-3 text-sm font-semibold text-slate-700"
                onClick={() => navigate(createPageUrl('News'))}
              >
                More news
              </button>
            </>
          )}
        </section>

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
                    className="w-full bg-surface-container rounded-2xl shadow-md overflow-hidden"
                  >
                    <div className="relative h-44">
                      {tailgates[0].photo_url ? (
                        <img src={tailgates[0].photo_url} alt={tailgates[0].name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400" />
                      )}
                      <div className="absolute top-3 left-3 bg-surface-container rounded-xl px-3 py-2 shadow-lg">
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
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 border-2 border-surface-container" />
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-red-600 border-2 border-surface-container" />
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-teal-600 border-2 border-surface-container" />
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
                        className="bg-surface-container rounded-2xl shadow-md overflow-hidden text-left"
                      >
                        <div className="relative h-32">
                          {tailgate.photo_url ? (
                            <img src={tailgate.photo_url} alt={tailgate.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400" />
                          )}
                          <div className="absolute top-2 left-2 bg-surface-container rounded-lg px-2 py-1 shadow">
                            <p className="text-lg font-bold text-orange-600">{tailgateDate(tailgate) ? format(tailgateDate(tailgate), 'd') : '--'}</p>
                            <p className="text-[10px] font-semibold text-orange-600 uppercase leading-none">{tailgateDate(tailgate) ? format(tailgateDate(tailgate), 'MMM') : 'TBD'}</p>
                          </div>
                        </div>
                        <div className="p-3">
                          <h3 className="font-bold text-sm mb-1 truncate">{tailgate.name}</h3>
                          <p className="text-xs text-gray-500 mb-2">{tailgate.start_time || '8:30 pm'} - {tailgate.end_time || '11:00 pm'}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex -space-x-1.5">
                              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 border border-surface-container" />
                              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-400 to-red-600 border border-surface-container" />
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
              <TailgateIcon className="w-12 h-12 text-on-surface-variant mx-auto mb-3" />
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
        
      </div>
      
      {/* Safety Button */}
      
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

      {/* Story sheet (headline stays in the app; full story/video opens on ESPN) */}
      <VideoStorySheet
        video={openStory}
        open={!!openStory}
        onOpenChange={(open) => !open && setOpenStory(null)}
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
