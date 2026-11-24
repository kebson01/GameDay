import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { ArrowLeft, MapPin, Users, Trophy, Calendar, Newspaper, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GameCard from '@/components/common/GameCard';
import TeamFeed from '@/components/teams/TeamFeed';
import NewsFeed from '@/components/news/NewsFeed';
import AdvancedStats from '@/components/teams/AdvancedStats';
import HistoricalPerformance from '@/components/teams/HistoricalPerformance';
import HeadToHeadDisplay from '@/components/teams/HeadToHeadDisplay';
import PredictionWidget from '@/components/teams/PredictionWidget';
import { toast } from 'sonner';

export default function TeamPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const urlParams = new URLSearchParams(window.location.search);
  const teamName = urlParams.get('team');

  useEffect(() => {
    client.auth.me().then(setUser).catch(() => {});
  }, []);

  // Prediction mutation
  const predictionMutation = useMutation({
    mutationFn: (predictionData) => client.entities.Prediction.create(predictionData),
    onSuccess: () => {
      queryClient.invalidateQueries(['predictions']);
    },
  });

  const { data: school } = useQuery({
    queryKey: ['school', teamName],
    queryFn: () => client.entities.School.filter({ name: teamName }).then(r => r[0]),
    enabled: !!teamName,
  });

  const { data: gamesData } = useQuery({
    queryKey: ['team-games', teamName],
    queryFn: () => client.functions.invoke('fetchLiveScores'),
    enabled: !!teamName,
  });

  // Filter games for this team
  const teamGames = (gamesData?.data?.games || []).filter(game => teamName && (
    game.home_team?.toLowerCase().includes(teamName.toLowerCase()) ||
    game.away_team?.toLowerCase().includes(teamName.toLowerCase()) ||
    game.opponent?.toLowerCase().includes(teamName.toLowerCase())
  ));

  const upcomingGames = teamGames.filter(g => g.status === 'upcoming' || g.status === 'live');
  const recentGames = teamGames.filter(g => g.status === 'final').slice(0, 3);

  // Fetch advanced team statistics
  const { data: teamStats, isLoading: statsLoading } = useQuery({
    queryKey: ['team-stats', teamName],
    queryFn: async () => {
      const response = await client.functions.invoke('fetchTeamStats', { team_name: teamName });
      return response.data.stats;
    },
    enabled: !!teamName,
  });

  // Fetch head-to-head for next opponent
  const nextGame = upcomingGames[0];
  const isTeam = (name) => name?.toLowerCase().includes(teamName?.toLowerCase());
  const nextOpponent = nextGame?.opponent
    || (nextGame && (isTeam(nextGame.home_team) ? nextGame.away_team : nextGame.home_team));
  const { data: headToHead, isLoading: h2hLoading } = useQuery({
    queryKey: ['head-to-head', teamName, nextOpponent],
    queryFn: async () => {
      const response = await client.functions.invoke('fetchHeadToHead', { 
        team1: teamName, 
        team2: nextOpponent 
      });
      return response.data.head_to_head;
    },
    enabled: !!nextOpponent && nextOpponent !== teamName,
  });

  if (!teamName) {
    return (
      <div className="gd-page flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-slate-500 mb-4">Team not specified</p>
          <Button onClick={() => navigate(createPageUrl('MyTeams'))}>
            Back to My Teams
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="gd-page">
      {/* Hero Header */}
      <div 
        className="relative h-48 overflow-hidden"
        style={{
          background: school?.primary_color 
            ? `linear-gradient(135deg, ${school.primary_color}, ${school.secondary_color || school.primary_color})`
            : 'linear-gradient(135deg, #FF6B35, #FF8C42)'
        }}
      >
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 flex flex-col">
          <div className="flex items-center gap-3 p-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/20"
              onClick={() => navigate(createPageUrl('MyTeams'))}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            {school?.logo_url ? (
              <img 
                src={school.logo_url} 
                alt={teamName}
                className="w-20 h-20 object-contain mb-3"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-4xl mb-3">
                🏈
              </div>
            )}
            <h1 className="text-2xl font-bold text-white text-center">{teamName}</h1>
            {school?.mascot && (
              <p className="text-white/90 text-sm mt-1">{school.mascot}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                <Users className="w-3 h-3 mr-1" />
                {school?.follower_count || 0} followers
              </Badge>
              {school?.conference && (
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  {school.conference}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stadium Info */}
      {school?.stadium_name && (
        <div className="mx-4 -mt-6 bg-surface-container rounded-2xl p-4 shadow-lg mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Home Stadium</p>
              <p className="font-semibold text-slate-900">{school.stadium_name}</p>
            </div>
          </div>
        </div>
      )}

      {/* Content Tabs */}
      <div className="px-4">
        <Tabs defaultValue="games" className="w-full">
          <TabsList className="w-full grid grid-cols-4 mb-4">
            <TabsTrigger value="games">
              <Calendar className="w-4 h-4 mr-2" />
              Games
            </TabsTrigger>
            <TabsTrigger value="stats">
              <Trophy className="w-4 h-4 mr-2" />
              Stats
            </TabsTrigger>
            <TabsTrigger value="news">
              <Newspaper className="w-4 h-4 mr-2" />
              News
            </TabsTrigger>
            <TabsTrigger value="social">
              <Users className="w-4 h-4 mr-2" />
              Social
            </TabsTrigger>
          </TabsList>

          <TabsContent value="games" className="space-y-4">
            {/* Next Opponent Head-to-Head */}
            {nextOpponent && nextOpponent !== teamName && (
              <div>
                <h3 className="font-bold text-slate-900 mb-3">Next Up: vs {nextOpponent}</h3>
                <HeadToHeadDisplay 
                  data={headToHead} 
                  team1={teamName} 
                  team2={nextOpponent}
                  isLoading={h2hLoading}
                />
              </div>
            )}

            {upcomingGames.length > 0 && (
              <div>
                <h3 className="font-bold text-slate-900 mb-3">Upcoming & Live</h3>
                <div className="space-y-3">
                  {upcomingGames.map((game, idx) => (
                    <div key={idx}>
                      <GameCard game={game} />
                      {user && game.status === 'upcoming' && (
                        <div className="mt-2 flex justify-end">
                          <PredictionWidget 
                            game={game} 
                            user={user}
                            onPredict={(data) => predictionMutation.mutateAsync(data)}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recentGames.length > 0 && (
              <div>
                <h3 className="font-bold text-slate-900 mb-3">Recent Results</h3>
                <div className="space-y-3">
                  {recentGames.map((game, idx) => (
                    <GameCard key={idx} game={game} />
                  ))}
                </div>
              </div>
            )}

            {teamGames.length === 0 && (
              <div className="text-center py-12 bg-surface-container rounded-2xl">
                <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No games scheduled</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <AdvancedStats stats={teamStats} isLoading={statsLoading} />
            {teamStats?.historical_seasons && teamStats.historical_seasons.length > 0 && (
              <HistoricalPerformance seasons={teamStats.historical_seasons} isLoading={statsLoading} />
            )}
          </TabsContent>

          <TabsContent value="news">
            <NewsFeed teamName={teamName} />
          </TabsContent>

          <TabsContent value="social">
            {user ? (
              <TeamFeed teamName={teamName} user={user} />
            ) : (
              <div className="text-center py-12 bg-surface-container rounded-2xl">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 mb-3">Sign in to join the conversation</p>
                <Button 
                  onClick={() => client.auth.redirectToLogin()}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  Sign In
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}