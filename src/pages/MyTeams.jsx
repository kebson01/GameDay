import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/lib/auth';
import {
  fetchScoreboard, fetchTeamSchedule, fetchStories, fetchVideoNews, fetchStandings, fetchRankings, POPULAR_TEAMS,
} from '@/lib/sportsApi';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Star, Plus, Search, Compass, Calendar, Film, Newspaper, Radio, Trophy } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import SafetyButton from '@/components/common/SafetyButton';
import AppHeader from '@/components/layout/AppHeader';
import FeaturedGame from '@/components/scores/FeaturedGame';
import ScoreCard from '@/components/scores/ScoreCard';
import VideoHighlights from '@/components/video/VideoHighlights';
import { Skeleton } from '@/components/common/LoadingSkeleton';
import FollowedTeamCard from '@/components/teams-v2/FollowedTeamCard';
import ScheduleRow from '@/components/teams-v2/ScheduleRow';
import StoryList from '@/components/teams-v2/StoryList';
import TeamLogo from '@/components/teams-v2/TeamLogo';
import { resolveTeam, summarizeSchedule, liveGameQuery } from '@/lib/teamData';

function SectionTitle({ children, aside }) {
  return (
    <h2 className="flex items-center justify-between gap-2 font-display text-lg font-bold uppercase tracking-wide text-on-surface">
      <span className="flex items-center gap-2">{children}</span>
      {aside}
    </h2>
  );
}

export default function MyTeams() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(
    () => new URLSearchParams(window.location.search).get('add') === '1'
  );
  const [newTeam, setNewTeam] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [selectedConference, setSelectedConference] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTeamForSchedule, setSelectedTeamForSchedule] = useState(null);

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

  const favoriteTeams = user?.favorite_teams || [];

  // ESPN identity for each followed team (id, colors, logo)
  const { data: resolved = {}, isLoading: resolving } = useQuery({
    queryKey: ['teams-v2', 'resolve-many', favoriteTeams],
    queryFn: async () => {
      const entries = await Promise.all(favoriteTeams.map(async n => [n, await resolveTeam(n).catch(() => null)]));
      return Object.fromEntries(entries);
    },
    enabled: favoriteTeams.length > 0,
    staleTime: Infinity,
  });
  const followedIds = favoriteTeams.map(n => resolved[n]?.id).filter(Boolean);

  // This week's games from ESPN
  const { data: games = [], isLoading: gamesLoading } = useQuery({
    queryKey: ['live-scores'],
    queryFn: fetchScoreboard,
    refetchInterval: 60000,
  });

  const { data: standings = [] } = useQuery({
    queryKey: ['teams-v2', 'standings'],
    queryFn: () => fetchStandings(),
    staleTime: 10 * 60 * 1000,
    enabled: favoriteTeams.length > 0,
  });
  const { data: rankings = [] } = useQuery({
    queryKey: ['teams-v2', 'rankings'],
    queryFn: fetchRankings,
    staleTime: 30 * 60 * 1000,
    enabled: favoriteTeams.length > 0,
  });

  // Schedule sheet
  const teamIdForSchedule = selectedTeamForSchedule?.id;
  const { data: teamSchedule = [], isLoading: scheduleLoading } = useQuery({
    queryKey: ['team-schedule', teamIdForSchedule],
    queryFn: () => fetchTeamSchedule(teamIdForSchedule),
    enabled: !!teamIdForSchedule,
    staleTime: 5 * 60 * 1000,
  });

  // News + film for followed teams (first three), or the national feed
  const newsIds = followedIds.slice(0, 3);
  const { data: stories = [], isLoading: storiesLoading } = useQuery({
    queryKey: ['teams-v2', 'stories', newsIds],
    queryFn: async () => {
      if (!newsIds.length) return fetchStories({ limit: 20 });
      const lists = await Promise.all(newsIds.map(id => fetchStories({ teamId: id, limit: 12 })));
      const seen = new Set();
      return lists.flat()
        .filter(s => (seen.has(s.id) ? false : seen.add(s.id)))
        .sort((a, b) => new Date(b.published || 0) - new Date(a.published || 0));
    },
    enabled: !isLoading && (!favoriteTeams.length || !resolving),
    staleTime: 5 * 60 * 1000,
  });
  const { data: videos = [], isLoading: videosLoading } = useQuery({
    queryKey: ['teams-v2', 'videos', newsIds],
    queryFn: async () => {
      const lists = await Promise.all(newsIds.map(id => fetchVideoNews({ teamId: id, limit: 20 })));
      const seen = new Set();
      return lists.flat()
        .filter(v => (seen.has(v.id) ? false : seen.add(v.id)))
        .sort((a, b) => new Date(b.published || 0) - new Date(a.published || 0));
    },
    enabled: newsIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Conference list + filtered teams for the Add dialog
  const conferenceList = ['all', ...new Set(POPULAR_TEAMS.map(t => t.conference).filter(Boolean))];
  const filteredTeams = POPULAR_TEAMS.filter(t => {
    const matchesSearch = !teamSearch.trim() ||
      t.name.toLowerCase().includes(teamSearch.toLowerCase()) ||
      t.abbreviation.toLowerCase().includes(teamSearch.toLowerCase()) ||
      t.conference?.toLowerCase().includes(teamSearch.toLowerCase());
    const matchesConference = selectedConference === 'all' || t.conference === selectedConference;
    return matchesSearch && matchesConference;
  });

  // Games involving followed teams (by ESPN id; exact name as a fallback)
  const favLower = favoriteTeams.map(t => t.toLowerCase());
  const isMyGame = (g) =>
    followedIds.includes(String(g.home_team_id)) || followedIds.includes(String(g.away_team_id)) ||
    favLower.includes(g.home_team?.toLowerCase()) || favLower.includes(g.away_team?.toLowerCase());
  const myTeamsGames = favoriteTeams.length ? games.filter(isMyGame) : [];
  const liveGames = myTeamsGames.filter(g => g.status === 'live');
  const upcomingGames = myTeamsGames.filter(g => g.status === 'upcoming').sort((a, b) => new Date(a.full_date) - new Date(b.full_date));
  const finalGames = myTeamsGames.filter(g => g.status === 'final').sort((a, b) => new Date(b.full_date) - new Date(a.full_date));

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

  const openGame = (g) => navigate(createPageUrl('LiveGame') + liveGameQuery(g));
  const openTeam = (name) => navigate(createPageUrl('TeamPage') + `?team=${encodeURIComponent(name)}`);
  const openAdd = () => {
    if (!user) {
      toast.error('Sign in to follow teams');
      navigate(createPageUrl('UserProfile'));
      return;
    }
    setShowAddDialog(true);
  };

  const scheduleSummary = useMemo(() => summarizeSchedule(teamSchedule), [teamSchedule]);
  const sheetTeam = selectedTeamForSchedule;
  const openScheduleGame = (g) =>
    openGame({
      id: g.id,
      home_team: g.is_home ? sheetTeam?.name : g.opponent,
      away_team: g.is_home ? g.opponent : sheetTeam?.name,
    });

  if (isLoading) {
    return (
      <div className="gd-page flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  // Allow viewing even if not logged in
  const displayTeams = user ? favoriteTeams : [];
  const [featuredLive, ...otherLive] = liveGames;

  return (
    <div className="gd-page">
      <AppHeader
        eyebrow="Roster Hub"
        title="My Teams"
        actions={
          <button
            type="button"
            aria-label="Discover teams"
            onClick={() => navigate(createPageUrl('DiscoverTeams'))}
            className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface"
          >
            <Compass className="h-5 w-5" />
          </button>
        }
      />

      <main className="space-y-6 px-4 pt-4">
        {/* Followed teams */}
        <section className="space-y-3" aria-labelledby="followed-teams">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="gd-eyebrow">Program tracking</p>
              <h2 id="followed-teams" className="font-display text-2xl font-bold uppercase leading-tight text-on-surface">
                Following {user && <span className="text-orange-600 dark:text-brand-soft">{displayTeams.length}</span>}
              </h2>
            </div>
            <button
              type="button"
              onClick={openAdd}
              className="gd-btn-primary flex h-10 items-center gap-1.5 rounded-xl px-3.5 font-display text-sm font-bold uppercase tracking-wide"
            >
              <Plus className="h-4 w-4" />
              Add Team
            </button>
          </div>

          {displayTeams.length > 0 ? (
            <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
              {displayTeams.map(name => {
                const team = resolved[name];
                const row = standings.find(s => team?.id && String(s.team_id) === String(team.id));
                const rank = rankings.find(r => team?.id && String(r.team_id) === String(team.id))?.rank;
                return (
                  <FollowedTeamCard
                    key={name}
                    name={name}
                    team={team}
                    rank={rank}
                    record={row?.overall_record}
                    conferenceRecord={row?.conference_record}
                    conference={row?.conference || team?.conference}
                    liveGame={liveGames.some(g => team?.id && [String(g.home_team_id), String(g.away_team_id)].includes(team.id))}
                    onOpen={() => openTeam(name)}
                    onSchedule={() => setSelectedTeamForSchedule({ name: team?.name || name, id: team?.id || null, team })}
                    onRemove={() => removeTeam(name)}
                  />
                );
              })}
              <button
                type="button"
                onClick={openAdd}
                className="flex w-32 shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-outline-variant text-on-surface-variant hover:border-brand hover:text-orange-600 dark:border-white/[0.12] dark:hover:text-brand-soft"
              >
                <Plus className="h-6 w-6" />
                <span className="font-display text-sm font-bold uppercase">Add team</span>
              </button>
            </div>
          ) : !user ? (
            <div className="gd-card px-6 py-10 text-center">
              <Star className="mx-auto mb-3 h-10 w-10 text-amber-500" />
              <p className="font-display text-xl font-bold uppercase text-on-surface">Sign in to follow teams</p>
              <p className="mt-1 text-sm text-on-surface-variant">Get live scores, schedules and news for your programs.</p>
              <div className="mt-4 flex justify-center gap-2">
                <button type="button" className="gd-btn-primary h-11 rounded-xl px-5" onClick={() => navigate(createPageUrl('UserProfile'))}>
                  Sign In
                </button>
                <button
                  type="button"
                  className="h-11 rounded-xl bg-surface-container-high px-5 font-semibold text-on-surface"
                  onClick={() => navigate(createPageUrl('DiscoverTeams'))}
                >
                  Browse teams
                </button>
              </div>
            </div>
          ) : (
            <div className="gd-card px-6 py-10 text-center">
              <Star className="mx-auto mb-3 h-10 w-10 text-amber-500" />
              <p className="font-display text-xl font-bold uppercase text-on-surface">No teams followed yet</p>
              <p className="mt-1 text-sm text-on-surface-variant">Add teams to see their games here.</p>
              <button
                type="button"
                className="gd-btn-primary mt-4 h-11 rounded-xl px-5"
                onClick={() => navigate(createPageUrl('DiscoverTeams'))}
              >
                Discover teams
              </button>
            </div>
          )}
        </section>

        {/* Live games */}
        {featuredLive && (
          <section className="space-y-3">
            <SectionTitle aside={<span className="gd-pill bg-red-600 text-white">{liveGames.length} live</span>}>
              <Radio className="h-5 w-5 text-red-500" />Live Now
            </SectionTitle>
            <FeaturedGame game={featuredLive} onOpen={openGame} />
            {otherLive.map(g => <ScoreCard key={g.id} game={g} favorite onOpen={openGame} />)}
          </section>
        )}

        {/* Upcoming */}
        {upcomingGames.length > 0 && (
          <section className="space-y-3">
            <SectionTitle aside={<span className="text-xs font-semibold normal-case text-on-surface-variant">This week</span>}>
              <Calendar className="h-5 w-5 text-orange-500" />Upcoming Clashes
            </SectionTitle>
            {upcomingGames.map((g, i) => (
              <div key={g.id}>
                {g.game_date !== upcomingGames[i - 1]?.game_date && (
                  <p className="mb-1.5 text-xs font-semibold text-on-surface-variant">{g.game_date}</p>
                )}
                <ScoreCard game={g} favorite onOpen={openGame} />
              </div>
            ))}
          </section>
        )}

        {/* Finals this week */}
        {finalGames.length > 0 && (
          <section className="space-y-3">
            <SectionTitle><Trophy className="h-5 w-5 text-amber-500" />Final Scores</SectionTitle>
            {finalGames.map(g => <ScoreCard key={g.id} game={g} favorite onOpen={openGame} />)}
          </section>
        )}

        {displayTeams.length > 0 && myTeamsGames.length === 0 && !gamesLoading && (
          <div className="gd-card px-6 py-8 text-center">
            <p className="text-3xl">🏈</p>
            <p className="mt-2 font-display text-lg font-bold uppercase text-on-surface">No games for your teams this week</p>
            <p className="mt-1 text-sm text-on-surface-variant">Check the schedule for upcoming games.</p>
            <button
              type="button"
              className="gd-btn-primary mt-4 h-11 rounded-xl px-5"
              onClick={() => navigate(createPageUrl('Schedule'))}
            >
              View Schedule
            </button>
          </div>
        )}

        {/* Film room */}
        {newsIds.length > 0 && (videosLoading || videos.length > 0) && (
          <section className="space-y-3">
            <SectionTitle><Film className="h-5 w-5 text-orange-500" />Film Room</SectionTitle>
            <VideoHighlights videos={videos} isLoading={videosLoading} layout="rail" maxItems={10} />
          </section>
        )}

        {/* News */}
        <section className="space-y-3">
          <SectionTitle aside={<span className="text-xs font-semibold normal-case text-on-surface-variant">{newsIds.length ? 'Your teams' : 'College football'}</span>}>
            <Newspaper className="h-5 w-5 text-orange-500" />Insiders &amp; News
          </SectionTitle>
          <StoryList stories={stories.filter(s => !s.is_video)} isLoading={storiesLoading} max={8} />
        </section>
      </main>

      {/* Add Team Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => {
        setShowAddDialog(open);
        if (!open) {
          setTeamSearch('');
          setSelectedConference('all');
        }
      }}>
        <DialogContent className="flex max-h-[85vh] w-[calc(100%-2rem)] max-w-md flex-col gap-3 rounded-2xl border-outline-variant bg-surface p-4 dark:border-white/[0.08]">
          <DialogHeader className="text-left">
            <DialogTitle className="font-display text-2xl font-bold uppercase text-on-surface">Add a Team</DialogTitle>
            <DialogDescription className="text-on-surface-variant">Pick a program to follow its games and news.</DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
            <input
              placeholder="Search teams or conferences…"
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
              className="gd-input pl-10"
              aria-label="Search teams"
            />
          </div>

          <div className="gd-chip-row !mx-0 !px-0" role="toolbar" aria-label="Filter by conference">
            {conferenceList.map((conf) => (
              <button
                key={conf}
                type="button"
                className="gd-chip"
                aria-pressed={selectedConference === conf}
                onClick={() => setSelectedConference(conf)}
              >
                {conf === 'all' ? 'All' : conf}
              </button>
            ))}
          </div>

          <p className="text-xs text-on-surface-variant">
            {filteredTeams.length} team{filteredTeams.length !== 1 ? 's' : ''} found
            {selectedConference !== 'all' && ` in ${selectedConference}`}
          </p>

          <div className="-mx-1 min-h-0 flex-1 space-y-1 overflow-y-auto px-1">
            {filteredTeams.length > 0 ? (
              filteredTeams.map((team) => {
                const isFollowed = displayTeams.includes(team.name);
                return (
                  <button
                    key={`${team.id}-${team.name}`}
                    type="button"
                    onClick={() => !isFollowed && addTeam(team.name)}
                    disabled={isFollowed}
                    className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-surface-container-high disabled:hover:bg-transparent"
                  >
                    <TeamLogo src={`https://a.espncdn.com/i/teamlogos/ncaa/500/${team.id}.png`} abbr={team.abbreviation} className="h-10 w-10" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-on-surface">{team.name}</span>
                      <span className="text-xs text-on-surface-variant">{team.conference}</span>
                    </span>
                    {isFollowed ? (
                      <span className="gd-pill bg-emerald-500/15 text-emerald-600 dark:text-brand-win">Following</span>
                    ) : (
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/15 text-orange-600 dark:text-brand-soft" aria-hidden="true">
                        <Plus className="h-4 w-4" />
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="py-8 text-center text-on-surface-variant">
                <p>No teams found</p>
                <p className="mt-1 text-xs">Try a different search or conference</p>
              </div>
            )}
          </div>

          <div className="border-t border-outline-variant pt-3 dark:border-white/[0.08]">
            <p className="mb-2 text-xs text-on-surface-variant">Or enter any team name:</p>
            <div className="flex gap-2">
              <input
                placeholder="Team name"
                value={newTeam}
                onChange={(e) => setNewTeam(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTeam(newTeam)}
                className="gd-input"
                aria-label="Custom team name"
              />
              <button
                type="button"
                className="gd-btn-primary h-12 shrink-0 rounded-xl px-5 disabled:opacity-50"
                onClick={() => addTeam(newTeam)}
                disabled={!newTeam.trim()}
              >
                Add
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Team Schedule Sheet */}
      <Sheet open={!!selectedTeamForSchedule} onOpenChange={(open) => !open && setSelectedTeamForSchedule(null)}>
        <SheetContent side="bottom" className="flex h-[85vh] flex-col gap-0 rounded-t-3xl border-outline-variant bg-surface p-0 dark:border-white/[0.08]">
          <SheetHeader className="border-b border-outline-variant px-4 pb-3 pt-5 text-left dark:border-white/[0.08]">
            <SheetTitle className="flex items-center gap-3">
              <TeamLogo
                src={sheetTeam?.team?.logo || (teamIdForSchedule && `https://a.espncdn.com/i/teamlogos/ncaa/500/${teamIdForSchedule}.png`)}
                abbr={sheetTeam?.team?.abbreviation || sheetTeam?.name?.slice(0, 3)}
                className="h-12 w-12"
              />
              <span className="min-w-0">
                <span className="block truncate font-display text-xl font-bold uppercase text-on-surface">{sheetTeam?.name}</span>
                <SheetDescription className="text-xs font-normal text-on-surface-variant">
                  {sheetTeam?.team?.conference ? `${sheetTeam.team.conference} • ` : ''}Season schedule
                </SheetDescription>
              </span>
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {scheduleLoading ? (
              [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)
            ) : !teamIdForSchedule ? (
              <div className="py-12 text-center text-on-surface-variant">
                <Calendar className="mx-auto mb-3 h-10 w-10" />
                <p>Schedule not available for this team</p>
                <p className="mt-1 text-sm">Try removing and re-adding this team from the list</p>
              </div>
            ) : teamSchedule.length === 0 ? (
              <div className="py-12 text-center text-on-surface-variant">
                <Calendar className="mx-auto mb-3 h-10 w-10" />
                <p>No games found</p>
              </div>
            ) : (
              <>
                <div className="mb-2 grid grid-cols-3 gap-2">
                  {[
                    ['Record', `${scheduleSummary.wins}-${scheduleSummary.losses}`],
                    ['Remaining', scheduleSummary.remaining],
                    ['Streak', scheduleSummary.streak || '—'],
                  ].map(([label, value]) => (
                    <div key={label} className="gd-card p-2.5 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">{label}</p>
                      <p className="gd-score text-2xl text-on-surface">{value}</p>
                    </div>
                  ))}
                </div>
                {teamSchedule.map((game, idx) => (
                  <ScheduleRow key={game.id || idx} game={game} onOpen={openScheduleGame} />
                ))}
                <button
                  type="button"
                  className="mt-2 h-11 w-full rounded-xl bg-surface-container-high font-semibold text-on-surface"
                  onClick={() => openTeam(sheetTeam?.name)}
                >
                  Open team page
                </button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <SafetyButton />
    </div>
  );
}
