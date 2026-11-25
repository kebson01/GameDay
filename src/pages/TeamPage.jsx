import React, { useState, useEffect, useMemo } from 'react';
import { getGuestTeams, saveFavoriteTeams, mergeGuestTeams } from '@/lib/favorites';
import { useNavigate } from 'react-router-dom';
import { client } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Users, Trophy, Calendar, Newspaper, Swords, Film } from 'lucide-react';
import { toast } from 'sonner';
import AppHeader from '@/components/layout/AppHeader';
import FeaturedGame from '@/components/scores/FeaturedGame';
import TeamFeed from '@/components/teams/TeamFeed';
import AdvancedStats from '@/components/teams/AdvancedStats';
import HistoricalPerformance from '@/components/teams/HistoricalPerformance';
import HeadToHeadDisplay from '@/components/teams/HeadToHeadDisplay';
import PredictionWidget from '@/components/teams/PredictionWidget';
import VideoHighlights from '@/components/video/VideoHighlights';
import { Skeleton } from '@/components/common/LoadingSkeleton';
import TeamHero from '@/components/teams-v2/TeamHero';
import ScheduleRow from '@/components/teams-v2/ScheduleRow';
import StoryList from '@/components/teams-v2/StoryList';
import { fetchVideoNews, fetchStories, fetchTeamSchedule, fetchStandings, fetchRankings } from '@/lib/sportsApi';
import { resolveTeam, fetchTeamProfile, summarizeSchedule, isSameTeam, liveGameQuery } from '@/lib/teamData';

const TABS = [
  { id: 'games', label: 'Games', icon: Calendar },
  { id: 'stats', label: 'Stats', icon: Trophy },
  { id: 'news', label: 'News', icon: Newspaper },
  { id: 'social', label: 'Social', icon: Users },
];

const hasData = (o) => o && typeof o === 'object' && Object.keys(o).length > 0;

function SectionTitle({ children, aside, id }) {
  return (
    <h3 id={id} className="flex items-center justify-between gap-2 font-display text-lg font-bold uppercase tracking-wide text-on-surface">
      <span className="flex items-center gap-2">{children}</span>
      {aside && <span className="text-xs font-semibold normal-case tracking-normal text-on-surface-variant">{aside}</span>}
    </h3>
  );
}

function StatTile({ label, value, sub, accent }) {
  return (
    <div className="gd-card p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">{label}</p>
      <p className={`gd-score mt-0.5 text-3xl leading-none ${accent || 'text-on-surface'}`}>{value ?? '—'}</p>
      {sub && <p className="mt-1 text-xs text-on-surface-variant">{sub}</p>}
    </div>
  );
}

export default function TeamPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('games');
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

  // Local School record (follower count, stadium) if one exists
  const { data: school } = useQuery({
    queryKey: ['school', teamName],
    queryFn: () => client.entities.School.filter({ name: teamName }).then(r => r[0]),
    enabled: !!teamName,
  });

  // ESPN identity -> profile (colors, record, standing, next game)
  const { data: espnTeam, isLoading: resolving } = useQuery({
    queryKey: ['teams-v2', 'resolve', teamName],
    queryFn: () => resolveTeam(teamName),
    enabled: !!teamName,
    staleTime: Infinity,
  });
  const teamId = espnTeam?.id;

  const { data: profile } = useQuery({
    queryKey: ['teams-v2', 'profile', teamId],
    queryFn: () => fetchTeamProfile(teamId),
    enabled: !!teamId,
    staleTime: 60000,
  });

  const { data: schedule = [], isLoading: scheduleLoading } = useQuery({
    queryKey: ['team-schedule', teamId],
    queryFn: () => fetchTeamSchedule(teamId),
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: standings = [] } = useQuery({
    queryKey: ['teams-v2', 'standings'],
    queryFn: () => fetchStandings(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: rankings = [] } = useQuery({
    queryKey: ['teams-v2', 'rankings'],
    queryFn: fetchRankings,
    staleTime: 30 * 60 * 1000,
  });

  // This week's scoreboard (live score, odds, TV for the next game)
  const { data: gamesData } = useQuery({
    queryKey: ['team-games', teamName],
    queryFn: () => client.functions.invoke('fetchLiveScores'),
    enabled: !!teamName,
    refetchInterval: 30000,
  });

  const fullName = profile?.name || espnTeam?.name || teamName;
  const standingRow = standings.find(s => teamId && String(s.team_id) === String(teamId));
  const apRank = rankings.find(r => teamId && String(r.team_id) === String(teamId))?.rank;

  const involves = (g) => teamId && [g.home_team_id, g.away_team_id].map(String).includes(String(teamId));
  const boardGames = (gamesData?.data?.games || []).filter(involves);

  // Next Up: live game > ESPN's next event (enriched with this week's scoreboard data) > upcoming on the board
  const nextGame = useMemo(() => {
    const live = boardGames.find(g => g.status === 'live');
    if (live) return live;
    const next = profile?.next_game && profile.next_game.status !== 'final' ? profile.next_game : null;
    if (next) return boardGames.find(g => String(g.id) === String(next.id)) || next;
    return boardGames.find(g => g.status === 'upcoming') || null;
  }, [boardGames, profile]);

  const nextOpponent = nextGame
    ? (String(nextGame.home_team_id) === String(teamId) ? nextGame.away_team : nextGame.home_team)
    : null;

  // Team video highlights from ESPN
  const { data: teamVideos = [], isLoading: videosLoading } = useQuery({
    queryKey: ['team-videos', teamId],
    queryFn: () => fetchVideoNews({ teamId }),
    enabled: !!teamId,
    staleTime: 300000,
  });

  // Team-tagged ESPN stories
  const { data: teamStories = [], isLoading: storiesLoading } = useQuery({
    queryKey: ['teams-v2', 'stories', teamId],
    queryFn: () => fetchStories({ teamId, limit: 20 }),
    enabled: !!teamId && tab === 'news',
    staleTime: 300000,
  });

  const { data: teamStats, isLoading: statsLoading } = useQuery({
    queryKey: ['team-stats', teamName],
    queryFn: async () => {
      const response = await client.functions.invoke('fetchTeamStats', { team_name: teamName });
      return response.data.stats;
    },
    enabled: !!teamName,
  });

  const { data: headToHead, isLoading: h2hLoading } = useQuery({
    queryKey: ['head-to-head', teamName, nextOpponent],
    queryFn: async () => {
      const response = await client.functions.invoke('fetchHeadToHead', {
        team1: teamName,
        team2: nextOpponent,
      });
      return response.data.head_to_head;
    },
    enabled: !!nextOpponent && nextOpponent !== teamName,
  });

  // Follow / unfollow (favorites are stored by team name on the profile)
  const [guestTeams, setGuestTeams] = useState(getGuestTeams);
  const favorites = user ? (user.favorite_teams || []) : guestTeams;
  const identity = { name: fullName, location: espnTeam?.location, short: espnTeam?.short };
  const isFollowing = favorites.some(f => f === teamName || isSameTeam(f, identity));
  const followMutation = useMutation({
    mutationFn: async () => {
      const next = isFollowing
        ? favorites.filter(f => !(f === teamName || isSameTeam(f, identity)))
        : [...favorites, fullName];
      return saveFavoriteTeams(user, next);
    },
    onSuccess: (next) => {
      if (user) setUser(prev => ({ ...prev, favorite_teams: next }));
      else setGuestTeams(next);
      queryClient.invalidateQueries(['user']);
      toast.success(isFollowing ? `Unfollowed ${fullName}` : `Following ${fullName}`);
    },
    onError: () => toast.error('Could not update your teams'),
  });
  const toggleFollow = () => {
    followMutation.mutate();
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: `${fullName} on GameDay`, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied');
      }
    } catch {
      // share sheet dismissed
    }
  };

  const openGame = (g) => navigate(createPageUrl('LiveGame') + liveGameQuery(g));
  const openScheduleGame = (g) =>
    openGame({
      id: g.id,
      home_team: g.is_home ? fullName : g.opponent,
      away_team: g.is_home ? g.opponent : fullName,
    });

  const summary = useMemo(() => summarizeSchedule(schedule), [schedule]);
  const upcoming = schedule
    .filter(g => g.status !== 'final' && !g.result)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const results = schedule
    .filter(g => g.result)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (!teamName) {
    return (
      <div className="gd-page">
        <AppHeader eyebrow="Team Hub" title="Team" back="MyTeams" />
        <main className="px-4 pt-4">
          <div className="gd-card px-6 py-12 text-center">
            <p className="font-display text-xl font-bold uppercase text-on-surface">Team not specified</p>
            <button
              type="button"
              className="gd-btn-primary mt-4 h-11 rounded-xl px-5"
              onClick={() => navigate(createPageUrl('MyTeams'))}
            >
              Back to My Teams
            </button>
          </div>
        </main>
      </div>
    );
  }

  const record = profile?.record || standingRow?.overall_record || (summary.played ? `${summary.wins}-${summary.losses}` : null);

  return (
    <div className="gd-page">
      <AppHeader eyebrow="Team Hub" title={profile?.short || espnTeam?.short || teamName} subtitle={profile?.standing || undefined} back />

      <main className="space-y-4 px-4 pt-4">
        {resolving && !espnTeam ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : (
          <TeamHero
            name={profile?.location || espnTeam?.location || teamName}
            mascot={profile?.mascot || school?.mascot}
            logo={profile?.logo || espnTeam?.logo || school?.logo_url}
            abbr={profile?.abbreviation || espnTeam?.abbreviation || teamName.slice(0, 3)}
            color={profile?.color || espnTeam?.color || school?.primary_color}
            altColor={profile?.alt_color || espnTeam?.alt_color || school?.secondary_color}
            rank={apRank}
            conference={standingRow?.conference || espnTeam?.conference || school?.conference}
            record={record}
            conferenceRecord={standingRow?.conference_record}
            standing={profile?.standing}
            streak={summary.streak}
            followers={school?.follower_count}
            stadium={school?.stadium_name}
            isFollowing={isFollowing}
            onToggleFollow={toggleFollow}
            followBusy={followMutation.isPending}
            onShare={share}
          />
        )}

        <div className="gd-segment grid-cols-4" role="tablist" aria-label="Team sections">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`team-tab-${id}`}
              aria-controls={`team-panel-${id}`}
              aria-selected={tab === id}
              onClick={() => setTab(id)}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`team-panel-${tab}`} aria-labelledby={`team-tab-${tab}`} className="space-y-4">
          {tab === 'games' && (
            <>
              {nextGame && (
                <section className="space-y-3" aria-labelledby="team-next-up">
                  <SectionTitle id="team-next-up" aside={nextGame.status === 'live' ? 'In progress' : nextGame.game_date}>
                    {nextGame.status === 'live' && <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
                    Next Up
                  </SectionTitle>
                  <FeaturedGame game={nextGame} onOpen={openGame} />
                  {user && nextGame.status === 'upcoming' && (
                    <div className="flex justify-end">
                      <PredictionWidget
                        game={nextGame}
                        user={user}
                        onPredict={(data) => predictionMutation.mutateAsync(data)}
                      />
                    </div>
                  )}
                </section>
              )}

              {/* Series history vs the next opponent (shown when the data source has it) */}
              {nextOpponent && nextOpponent !== teamName && (h2hLoading || hasData(headToHead)) && (
                <section className="space-y-3">
                  <SectionTitle><Swords className="h-5 w-5 text-orange-500" />Head to Head</SectionTitle>
                  <HeadToHeadDisplay data={headToHead} team1={teamName} team2={nextOpponent} isLoading={h2hLoading} />
                </section>
              )}

              {scheduleLoading || (resolving && !espnTeam) ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
                </div>
              ) : schedule.length === 0 ? (
                !nextGame && (
                  <div className="gd-card px-6 py-12 text-center">
                    <Trophy className="mx-auto mb-3 h-10 w-10 text-on-surface-variant" />
                    <p className="font-display text-xl font-bold uppercase text-on-surface">No games scheduled</p>
                    <p className="mt-1 text-sm text-on-surface-variant">ESPN has no schedule for this team yet.</p>
                  </div>
                )
              ) : (
                <>
                  {upcoming.length > 0 && (
                    <section className="space-y-2" aria-labelledby="team-upcoming">
                      <SectionTitle id="team-upcoming" aside={`${upcoming.length} remaining`}>Schedule</SectionTitle>
                      {upcoming.map(g => <ScheduleRow key={g.id} game={g} onOpen={openScheduleGame} />)}
                    </section>
                  )}
                  {results.length > 0 && (
                    <section className="space-y-2" aria-labelledby="team-results">
                      <SectionTitle id="team-results" aside={`${summary.wins}-${summary.losses}`}>
                        Results
                      </SectionTitle>
                      {results.map(g => <ScheduleRow key={g.id} game={g} onOpen={openScheduleGame} />)}
                    </section>
                  )}
                </>
              )}
            </>
          )}

          {tab === 'stats' && (
            <>
              <section className="space-y-3" aria-labelledby="team-season">
                <SectionTitle id="team-season" aside={summary.played ? `${summary.played} games played` : null}>Season Snapshot</SectionTitle>
                {scheduleLoading ? (
                  <div className="grid grid-cols-2 gap-2">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <StatTile label="Overall" value={record} sub={standingRow?.overall_record && standingRow.win_percentage ? `${Math.round(standingRow.win_percentage * 100)}% win rate` : null} />
                    <StatTile label="Conference" value={standingRow?.conference_record} sub={profile?.standing} />
                    <StatTile label="Points / game" value={summary.ppg != null ? summary.ppg.toFixed(1) : null} accent="text-emerald-600 dark:text-brand-win" sub="Scored" />
                    <StatTile label="Allowed / game" value={summary.opp_ppg != null ? summary.opp_ppg.toFixed(1) : null} accent="text-red-600 dark:text-red-400" sub="Opponents" />
                    <StatTile label="Home" value={summary.played ? summary.home : null} />
                    <StatTile label="Away / neutral" value={summary.played ? summary.away : null} />
                    <StatTile label="vs Ranked" value={summary.played ? summary.ranked : null} />
                    <StatTile label="Streak" value={summary.streak} accent={summary.streak?.startsWith('W') ? 'text-emerald-600 dark:text-brand-win' : 'text-on-surface'} />
                  </div>
                )}
              </section>
              {(statsLoading || hasData(teamStats)) && <AdvancedStats stats={teamStats} isLoading={statsLoading} />}
              {teamStats?.historical_seasons && teamStats.historical_seasons.length > 0 && (
                <HistoricalPerformance seasons={teamStats.historical_seasons} isLoading={statsLoading} />
              )}
            </>
          )}

          {tab === 'news' && (
            <>
              <section aria-labelledby="team-highlights" className="space-y-3">
                <SectionTitle id="team-highlights"><Film className="h-5 w-5 text-orange-500" />Highlights</SectionTitle>
                <VideoHighlights
                  videos={teamVideos}
                  isLoading={videosLoading || (resolving && !espnTeam)}
                  maxItems={8}
                  emptyText={`No recent ${teamName} videos from ESPN.`}
                />
              </section>
              <section className="space-y-3">
                <SectionTitle><Newspaper className="h-5 w-5 text-orange-500" />Latest News</SectionTitle>
                <StoryList
                  stories={teamStories.filter(st => !st.is_video)}
                  isLoading={storiesLoading || (resolving && !espnTeam)}
                  max={10}
                  emptyText={`No recent ${teamName} stories from ESPN.`}
                />
              </section>
            </>
          )}

          {tab === 'social' && (
            user ? (
              <TeamFeed teamName={teamName} user={user} />
            ) : (
              <div className="gd-card px-6 py-12 text-center">
                <Users className="mx-auto mb-3 h-10 w-10 text-on-surface-variant" />
                <p className="font-display text-xl font-bold uppercase text-on-surface">Join the conversation</p>
                <p className="mt-1 text-sm text-on-surface-variant">Sign in to post and comment with other {teamName} fans.</p>
                <button
                  type="button"
                  onClick={() => client.auth.redirectToLogin()}
                  className="gd-btn-primary mt-4 h-11 rounded-xl px-6"
                >
                  Sign In
                </button>
              </div>
            )
          )}
        </div>
      </main>

    </div>
  );
}
