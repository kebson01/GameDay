import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { client } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { ArrowLeft, RefreshCw, Activity, BarChart3, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PlayByPlay from '@/components/gameday/PlayByPlay';
import LiveGameStats from '@/components/gameday/LiveGameStats';
import GameAlerts from '@/components/gameday/GameAlerts';
import { fetchPlayByPlay, fetchLiveGameStats, fetchGameSummary } from '@/lib/sportsApi';

export default function LiveGame() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const gameId = searchParams.get('gameId');
  const homeTeamParam = searchParams.get('home');
  const awayTeamParam = searchParams.get('away');

  // Fetch game summary for live score updates
  const { data: gameSummary, refetch: refetchSummary } = useQuery({
    queryKey: ['game-summary', gameId],
    queryFn: () => fetchGameSummary(gameId),
    refetchInterval: 15000, // Refresh every 15 seconds for live games
    enabled: !!gameId,
  });

  // Fetch play-by-play with auto-refresh
  const { data: playByPlayData, isLoading: pbpLoading, refetch: refetchPBP } = useQuery({
    queryKey: ['play-by-play', gameId],
    queryFn: () => fetchPlayByPlay(gameId),
    refetchInterval: 20000, // Refresh every 20 seconds
    enabled: !!gameId,
  });

  // Fetch live stats with auto-refresh
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['live-stats', gameId],
    queryFn: () => fetchLiveGameStats(gameId),
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: !!gameId,
  });

  const handleRefresh = () => {
    refetchSummary();
    refetchPBP();
    refetchStats();
  };

  // Use summary data or fallback to URL params
  const homeTeam = gameSummary?.home?.name || homeTeamParam || 'Home';
  const awayTeam = gameSummary?.away?.name || awayTeamParam || 'Away';
  const homeScore = gameSummary?.home?.score ?? 0;
  const awayScore = gameSummary?.away?.score ?? 0;
  const homeLogo = gameSummary?.home?.logo;
  const awayLogo = gameSummary?.away?.logo;
  const homeAbbrev = gameSummary?.home?.abbreviation;
  const awayAbbrev = gameSummary?.away?.abbreviation;
  const period = gameSummary?.period;
  const clock = gameSummary?.clock;
  const statusDetail = gameSummary?.status_detail;
  const isLive = gameSummary?.status === 'in';
  const isFinal = gameSummary?.status === 'post';

  if (!gameId && !homeTeamParam) {
    return (
      <div className="gd-page flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-slate-500 mb-4">Game not found</p>
          <Button onClick={() => navigate(createPageUrl('GameDay'))}>
            Back to Game Day
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="gd-page pb-24">
      {/* Game Alerts */}
      <GameAlerts plays={playByPlayData?.plays} gameId={gameId} />

      {/* Header with Live Score */}
      <div className="bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900 text-white px-4 pt-12 pb-6 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => navigate(createPageUrl('GameDay'))}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            {isLive && (
              <>
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-semibold">LIVE</span>
              </>
            )}
            {isFinal && (
              <span className="text-sm font-semibold bg-ink-700 px-2 py-1 rounded">FINAL</span>
            )}
            {!isLive && !isFinal && (
              <span className="text-sm font-medium opacity-75">{statusDetail || 'Upcoming'}</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={handleRefresh}
          >
            <RefreshCw className="w-5 h-5" />
          </Button>
        </div>

        {/* Score Display */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
          <div className="grid grid-cols-3 gap-4 items-center">
            {/* Away Team */}
            <div className="text-center">
              {awayLogo ? (
                <img 
                  src={awayLogo} 
                  alt={awayTeam}
                  className="w-16 h-16 mx-auto mb-2 object-contain"
                />
              ) : (
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-2xl mb-2">
                  {(awayAbbrev || awayTeam).substring(0, 2).toUpperCase()}
                </div>
              )}
              <p className="font-semibold text-sm truncate">{awayAbbrev || awayTeam}</p>
              {gameSummary?.away?.rank && (
                <span className="text-xs opacity-75">#{gameSummary.away.rank}</span>
              )}
              <p className="gd-score text-5xl mt-2">{awayScore}</p>
            </div>

            {/* Game Info */}
            <div className="text-center">
              {isLive && period && clock ? (
                <>
                  <p className="text-sm opacity-75 mb-1">Q{period}</p>
                  <p className="text-lg font-bold">{clock}</p>
                </>
              ) : (
                <p className="text-sm opacity-75">{statusDetail || 'VS'}</p>
              )}
              {gameSummary?.situation && isLive && (
                <div className="mt-2 text-xs opacity-75">
                  <p>{gameSummary.situation.down}&{gameSummary.situation.distance}</p>
                  <p>{gameSummary.situation.yard_line} yard line</p>
                </div>
              )}
            </div>

            {/* Home Team */}
            <div className="text-center">
              {homeLogo ? (
                <img 
                  src={homeLogo} 
                  alt={homeTeam}
                  className="w-16 h-16 mx-auto mb-2 object-contain"
                />
              ) : (
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-orange-400 to-red-600 flex items-center justify-center text-2xl mb-2">
                  {(homeAbbrev || homeTeam).substring(0, 2).toUpperCase()}
                </div>
              )}
              <p className="font-semibold text-sm truncate">{homeAbbrev || homeTeam}</p>
              {gameSummary?.home?.rank && (
                <span className="text-xs opacity-75">#{gameSummary.home.rank}</span>
              )}
              <p className="gd-score text-5xl mt-2">{homeScore}</p>
            </div>
          </div>
        </div>

        {/* Venue & Broadcast Info */}
        {(gameSummary?.venue || gameSummary?.broadcasts) && (
          <div className="flex items-center justify-center gap-4 mt-3 text-xs opacity-75">
            {gameSummary.venue && (
              <span>📍 {gameSummary.venue}</span>
            )}
            {gameSummary.broadcasts?.[0] && (
              <span className="flex items-center gap-1">
                <Radio className="w-3 h-3" />
                {gameSummary.broadcasts[0]}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Content Tabs */}
      <div className="px-4 py-4">
        <Tabs defaultValue="plays" className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-4 bg-slate-100 p-1 rounded-xl">
            <TabsTrigger value="plays" className="rounded-lg data-[state=active]:bg-surface-container data-[state=active]:shadow-sm">
              <Activity className="w-4 h-4 mr-2" />
              Play-by-Play
            </TabsTrigger>
            <TabsTrigger value="stats" className="rounded-lg data-[state=active]:bg-surface-container data-[state=active]:shadow-sm">
              <BarChart3 className="w-4 h-4 mr-2" />
              Live Stats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plays">
            <PlayByPlay 
              data={playByPlayData} 
              isLoading={pbpLoading}
              homeTeam={homeAbbrev}
              awayTeam={awayAbbrev}
              homeLogo={homeLogo}
              awayLogo={awayLogo}
            />
          </TabsContent>

          <TabsContent value="stats">
            <LiveGameStats 
              data={statsData} 
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              homeLogo={homeLogo}
              awayLogo={awayLogo}
              isLoading={statsLoading} 
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
