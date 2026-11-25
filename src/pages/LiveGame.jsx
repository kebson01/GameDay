import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { client } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { ArrowLeft, RefreshCw, Activity, BarChart3, Radio, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PlayByPlay from '@/components/gameday/PlayByPlay';
import LiveGameStats from '@/components/gameday/LiveGameStats';
import GameAlerts from '@/components/gameday/GameAlerts';
import { fetchPlayByPlay, fetchLiveGameStats, fetchGameSummary, fetchGameVideos } from '@/lib/sportsApi';
import VideoHighlights from '@/components/video/VideoHighlights';
import AppHeader from '@/components/layout/AppHeader';
import WinProbabilityChart from '@/components/scores/WinProbabilityChart';
import TeamLink from '@/components/scores/TeamLink';

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
  // Video highlights (recap + key plays); new clips appear during/after games
  const { data: videos = [], isLoading: videosLoading, refetch: refetchVideos } = useQuery({
    queryKey: ['game-videos', gameId],
    queryFn: () => fetchGameVideos(gameId),
    enabled: !!gameId,
    staleTime: 60000,
    refetchInterval: 120000,
  });

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
    refetchVideos();
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

  const linescoreCount = Math.max(4, gameSummary?.home?.linescores?.length || 0, gameSummary?.away?.linescores?.length || 0);
  const periodLabel = (i) => (i < 4 ? `Q${i + 1}` : i === 4 ? 'OT' : `${i - 3}OT`);
  const isUpcoming = gameSummary && !isLive && !isFinal;
  const kickoff = gameSummary?.date
    ? new Date(gameSummary.date).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null;

  const TeamBlock = ({ team, align }) => (
    <div className={`flex min-w-0 flex-col gap-1 ${align === 'right' ? 'items-end text-right' : 'items-start'}`}>
      <TeamLink name={team?.name || team?.short} teamId={team?.id}>
        {team?.logo ? (
          <img src={team.logo} alt="" className="h-14 w-14 object-contain drop-shadow" />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-high font-display text-lg font-bold">
            {(team?.abbreviation || '').slice(0, 3)}
          </span>
        )}
      </TeamLink>
      <div className={`flex items-center gap-1.5 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        {team?.rank && <span className="rounded bg-surface-container-high px-1 text-[11px] font-bold text-orange-600 dark:text-brand-soft">#{team.rank}</span>}
        {team?.record && <span className="text-xs text-on-surface-variant tabular-nums">{team.record}</span>}
      </div>
      <span className={`flex max-w-full items-center gap-1 font-display text-xl font-bold uppercase leading-[1.05] text-on-surface line-clamp-2 ${align === 'right' ? 'justify-end' : ''}`}>
        {align === 'right' && team?.has_ball && isLive && <span className="text-sm">🏈</span>}
        {team?.short || team?.abbreviation}
        {align !== 'right' && team?.has_ball && isLive && <span className="text-sm">🏈</span>}
      </span>
    </div>
  );

  return (
    <div className="gd-page pb-24">
      {/* Game Alerts */}
      <GameAlerts plays={playByPlayData?.plays} gameId={gameId} />

      <AppHeader
        back="GameDay"
        eyebrow={isLive ? 'Live · Gamecast' : isFinal ? 'Final' : 'Matchup'}
        title={`${awayAbbrev || awayTeam} vs ${homeAbbrev || homeTeam}`}
        showProfile={false}
        actions={
          <button type="button" aria-label="Refresh" onClick={handleRefresh}
            className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface">
            <RefreshCw className="h-5 w-5" />
          </button>
        }
      />

      <div className="space-y-4 px-4 pt-4">
        {/* Scoreboard */}
        <section className={`gd-card relative overflow-hidden p-4 ${isLive ? 'gd-card-glow' : ''}`} aria-label="Scoreboard">
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-brand/15 blur-3xl" />
          <div className="relative">
            <div className="mb-3 flex items-center justify-center">
              {isLive ? (
                <span className="gd-pill bg-red-600 text-white"><span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  {gameSummary?.situation?.is_red_zone ? 'Red zone · ' : ''}{gameSummary?.status_short || `Q${period} ${clock}`}
                </span>
              ) : isFinal ? (
                <span className="gd-pill bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-700">{gameSummary?.status_short || 'Final'}</span>
              ) : (
                <span className="gd-pill bg-surface-container-high text-on-surface">{kickoff || statusDetail || 'Upcoming'}</span>
              )}
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <TeamBlock team={gameSummary?.away || { short: awayTeam }} align="left" />
              <div className="px-1 text-center">
                {isUpcoming ? (
                  <span className="font-display text-4xl font-extrabold text-slate-300 dark:text-slate-400">VS</span>
                ) : (
                  <div className="gd-score flex items-baseline gap-1.5 text-5xl text-on-surface">
                    <span className={isFinal && awayScore < homeScore ? 'text-slate-400' : ''}>{awayScore}</span>
                    <span className="text-2xl text-slate-400">–</span>
                    <span className={isFinal && homeScore < awayScore ? 'text-slate-400' : ''}>{homeScore}</span>
                  </div>
                )}
                {isLive && gameSummary?.situation?.down_distance && (
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">{gameSummary.situation.down_distance}</p>
                )}
              </div>
              <TeamBlock team={gameSummary?.home || { short: homeTeam }} align="right" />
            </div>

            {isLive && gameSummary?.situation?.possession_text && (
              <p className="mt-3 text-center text-xs font-bold uppercase tracking-wide text-orange-600 dark:text-brand-soft">
                🏈 Ball on {gameSummary.situation.possession_text}
              </p>
            )}

            {/* Line score */}
            {!isUpcoming && (gameSummary?.home?.linescores?.length > 0) && (
              <table className="mt-4 w-full text-sm tabular-nums">
                <thead>
                  <tr className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                    <th className="py-1 text-left font-bold">Team</th>
                    {Array.from({ length: linescoreCount }).map((_, i) => <th key={i} className="w-9 py-1 text-center font-bold">{periodLabel(i)}</th>)}
                    <th className="w-10 py-1 text-right font-bold text-on-surface">T</th>
                  </tr>
                </thead>
                <tbody>
                  {[gameSummary.away, gameSummary.home].map((t) => (
                    <tr key={t.abbreviation} className="border-t border-outline-variant/60 dark:border-white/[0.06]">
                      <td className="py-1.5 font-display text-base font-bold uppercase text-on-surface">{t.abbreviation}</td>
                      {Array.from({ length: linescoreCount }).map((_, i) => (
                        <td key={i} className="py-1.5 text-center text-on-surface-variant">{t.linescores[i] ?? '–'}</td>
                      ))}
                      <td className="py-1.5 text-right font-display text-lg font-extrabold text-on-surface">{t.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Venue strip with stadium photo */}
        {gameSummary?.venue && (
          <section className="gd-card relative overflow-hidden">
            {gameSummary.venue_image && (
              <img src={gameSummary.venue_image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" loading="lazy" />
            )}
            <div className="relative flex items-center gap-3 bg-gradient-to-r from-ink-900/90 via-ink-900/70 to-ink-900/30 p-4 text-white">
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg font-bold uppercase">{gameSummary.venue}</p>
                <p className="truncate text-xs text-white/75">
                  {[gameSummary.venue_city, gameSummary.attendance ? `${gameSummary.attendance.toLocaleString()} fans` : null].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="shrink-0 text-right text-xs">
                {gameSummary.broadcasts?.[0] && (
                  <p className="flex items-center justify-end gap-1 font-bold"><Radio className="h-3 w-3" />{gameSummary.broadcasts[0]}</p>
                )}
                {gameSummary.odds?.details && <p className="mt-0.5 text-white/80">{gameSummary.odds.details}{gameSummary.odds.over_under ? ` · O/U ${gameSummary.odds.over_under}` : ''}</p>}
              </div>
            </div>
          </section>
        )}

        {/* Win probability over the game */}
        {gameSummary?.win_probability?.length > 1 && (
          <WinProbabilityChart points={gameSummary.win_probability} home={gameSummary.home} away={gameSummary.away} live={isLive} />
        )}
      </div>

      {/* Content Tabs */}
      <div className="px-4 py-4">
        <Tabs defaultValue="plays" className="w-full">
          <TabsList className="mb-4 grid h-auto w-full grid-cols-3 gap-1 rounded-xl bg-surface-container-high p-1 dark:bg-surface-container">
            <TabsTrigger value="plays" className="rounded-lg py-2 font-semibold data-[state=active]:bg-surface-container data-[state=active]:text-on-surface data-[state=active]:shadow-sm dark:data-[state=active]:bg-surface-container-highest">
              <Activity className="w-4 h-4 mr-2" />
              Play-by-Play
            </TabsTrigger>
            <TabsTrigger value="stats" className="rounded-lg py-2 font-semibold data-[state=active]:bg-surface-container data-[state=active]:text-on-surface data-[state=active]:shadow-sm dark:data-[state=active]:bg-surface-container-highest">
              <BarChart3 className="w-4 h-4 mr-2" />
              Stats
            </TabsTrigger>
            <TabsTrigger value="highlights" className="rounded-lg py-2 font-semibold data-[state=active]:bg-surface-container data-[state=active]:text-on-surface data-[state=active]:shadow-sm dark:data-[state=active]:bg-surface-container-highest">
              <Film className="w-4 h-4 mr-1.5" />
              Highlights
              {videos.length > 0 && (
                <span className="ml-1.5 rounded-full bg-brand px-1.5 text-[10px] font-bold leading-4 text-white">
                  {videos.length}
                </span>
              )}
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

          <TabsContent value="highlights">
            <VideoHighlights
              videos={videos}
              isLoading={videosLoading}
              emptyText="Highlights usually appear on ESPN during the game and shortly after the final whistle."
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
