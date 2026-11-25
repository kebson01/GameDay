import React, { useState, useEffect, useMemo } from 'react';
import { getGuestTeams, saveFavoriteTeams, mergeGuestTeams } from '@/lib/favorites';
import { useNavigate } from 'react-router-dom';
import { client } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Search, Star, X, SlidersHorizontal, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import AppHeader from '@/components/layout/AppHeader';
import { Skeleton } from '@/components/common/LoadingSkeleton';
import DiscoverTeamCard from '@/components/teams-v2/DiscoverTeamCard';
import { fetchRankings, teamLogoUrl } from '@/lib/sportsApi';
import { fetchTeamIndex } from '@/lib/teamData';

const SORTS = [
  { id: 'ranked', label: 'Ranked first' },
  { id: 'az', label: 'A–Z' },
  { id: 'pct', label: 'Win %' },
];

export default function DiscoverTeams() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConference, setSelectedConference] = useState('all');
  const [sort, setSort] = useState('ranked');

  useEffect(() => {
    client.auth.me().then(setUser).catch(() => {});
  }, []);

  const [guestTeams, setGuestTeams] = useState(getGuestTeams);
  const favoriteTeams = user ? (user.favorite_teams || []) : guestTeams;

  const { data: schools = [] } = useQuery({
    queryKey: ['schools'],
    queryFn: () => client.entities.School.list(),
  });

  const { data: standingsData, isLoading: standingsLoading } = useQuery({
    queryKey: ['standings', 'all'],
    queryFn: async () => {
      const response = await client.functions.invoke('fetchStandings', { conference: 'fbs' });
      return response.data;
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: teamIndex = {} } = useQuery({
    queryKey: ['teams-v2', 'index'],
    queryFn: fetchTeamIndex,
    staleTime: Infinity,
  });

  const { data: rankings = [] } = useQuery({
    queryKey: ['teams-v2', 'rankings'],
    queryFn: fetchRankings,
    staleTime: 30 * 60 * 1000,
  });
  const rankById = useMemo(
    () => Object.fromEntries(rankings.map(r => [String(r.team_id), r.rank])),
    [rankings]
  );

  // Every FBS team from ESPN standings, merged with any locally saved School
  // records (follower counts, colors) and ESPN team colors.
  const allSchools = useMemo(() => {
    const espnTeams = standingsData?.standings || [];
    if (espnTeams.length === 0) return schools.map(s => ({ ...s, local_id: s.id }));
    const localByName = Object.fromEntries(schools.map(s => [s.name?.toLowerCase(), s]));
    return espnTeams.map(t => {
      const local = localByName[t.team_name?.toLowerCase()];
      const idx = teamIndex[String(t.team_id)];
      return {
        id: local?.id || `espn-${t.team_id}`,
        espn_id: t.team_id,
        name: t.team_name,
        abbreviation: t.abbreviation || idx?.abbreviation,
        conference: t.conference,
        logo: t.logo || teamLogoUrl(t.team_id),
        color: idx?.color || local?.primary_color,
        alt_color: idx?.alt_color || local?.secondary_color,
        follower_count: local?.follower_count || 0,
        local_id: local?.id,
        stats: t,
      };
    });
  }, [schools, standingsData, teamIndex]);

  const conferences = useMemo(() => {
    const counts = {};
    allSchools.forEach(s => { if (s.conference) counts[s.conference] = (counts[s.conference] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [allSchools]);

  const visible = useMemo(() => {
    let list = allSchools;
    if (selectedConference !== 'all') list = list.filter(s => s.conference === selectedConference);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.abbreviation?.toLowerCase().includes(q) ||
        s.mascot?.toLowerCase().includes(q) ||
        s.conference?.toLowerCase().includes(q)
      );
    }
    const rank = (s) => rankById[String(s.espn_id)] || 999;
    const pct = (s) => s.stats?.win_percentage ?? -1;
    const byName = (a, b) => a.name.localeCompare(b.name);
    return [...list].sort((a, b) => {
      if (sort === 'ranked') return rank(a) - rank(b) || pct(b) - pct(a) || byName(a, b);
      if (sort === 'pct') return pct(b) - pct(a) || (b.stats?.wins || 0) - (a.stats?.wins || 0) || byName(a, b);
      return byName(a, b);
    });
  }, [allSchools, selectedConference, searchQuery, sort, rankById]);

  const followMutation = useMutation({
    mutationFn: async (team) => {
      const isFollowing = favoriteTeams.includes(team.name);
      const newFavorites = isFollowing
        ? favoriteTeams.filter(t => t !== team.name)
        : [...favoriteTeams, team.name];

      await saveFavoriteTeams(user, newFavorites);
      if (!user) return { isFollowing, teamName: team.name, newFavorites };

      // Update follower count (signed-in fans only)
      const follower_count = Math.max((team.follower_count || 0) + (isFollowing ? -1 : 1), 0);
      if (team.local_id || !String(team.id).startsWith('espn-')) {
        await client.entities.School.update(team.local_id || team.id, { follower_count });
      } else {
        await client.entities.School.create({ name: team.name, conference: team.conference, follower_count });
      }

      return { isFollowing, teamName: team.name, newFavorites };
    },
    onSuccess: (data) => {
      if (user) setUser(prev => ({ ...prev, favorite_teams: data.newFavorites }));
      else setGuestTeams(data.newFavorites);
      queryClient.invalidateQueries(['user']);
      queryClient.invalidateQueries(['schools']);
      if (user) client.auth.me().then(setUser).catch(() => {});
      toast.success(data.isFollowing ? `Unfollowed ${data.teamName}` : `Following ${data.teamName}! 🎉`);
    },
    onError: () => toast.error('Could not update your teams'),
  });

  const toggleFollow = (team) => {
    followMutation.mutate(team);
  };

  const openTeam = (team) => navigate(createPageUrl('TeamPage') + `?team=${encodeURIComponent(team.name)}`);
  const clearFilters = () => { setSearchQuery(''); setSelectedConference('all'); };

  return (
    <div className="gd-page">
      <AppHeader
        eyebrow="Find your program"
        title="Discover Teams"
        back
        actions={favoriteTeams.length > 0 ? (
          <button
            type="button"
            onClick={() => navigate(createPageUrl('MyTeams'))}
            aria-label={`My teams (${favoriteTeams.length})`}
            className="flex h-10 items-center gap-1 rounded-full px-2 text-sm font-bold text-orange-600 dark:text-brand-soft"
          >
            <Star className="h-4 w-4 fill-current" />
            {favoriteTeams.length}
          </button>
        ) : null}
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="search"
            placeholder="Search by school, mascot or conference…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="gd-input pl-10 pr-10 [&::-webkit-search-cancel-button]:hidden"
            aria-label="Search teams"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </AppHeader>

      <main className="space-y-4 px-4 pt-4">
        {/* Conference chips */}
        <div className="gd-chip-row" role="toolbar" aria-label="Filter by conference">
          <button className="gd-chip" aria-pressed={selectedConference === 'all'} onClick={() => setSelectedConference('all')}>
            All ({allSchools.length})
          </button>
          {conferences.map(([conf, n]) => (
            <button key={conf} className="gd-chip" aria-pressed={selectedConference === conf} onClick={() => setSelectedConference(conf)}>
              {conf} ({n})
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-3">
          <span className="flex shrink-0 items-center gap-1.5 font-display text-sm font-bold uppercase tracking-wide text-on-surface-variant">
            <SlidersHorizontal className="h-4 w-4 text-orange-500" />Sort
          </span>
          <div className="gd-segment flex-1 grid-cols-3" role="tablist" aria-label="Sort teams">
            {SORTS.map(({ id, label }) => (
              <button key={id} type="button" role="tab" aria-selected={sort === id} onClick={() => setSort(id)} className="!py-1.5 !text-xs">
                {label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs font-semibold text-on-surface-variant">
          {visible.length} {visible.length === 1 ? 'team' : 'teams'}
          {selectedConference !== 'all' && ` in ${selectedConference}`}
        </p>

        {standingsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-36 w-full rounded-2xl" />)}
          </div>
        ) : visible.length > 0 ? (
          <div className="space-y-3">
            {visible.map(team => (
              <DiscoverTeamCard
                key={team.id}
                team={team}
                rank={rankById[String(team.espn_id)]}
                isFollowing={favoriteTeams.includes(team.name)}
                busy={followMutation.isPending && followMutation.variables?.name === team.name}
                onToggleFollow={() => toggleFollow(team)}
                onOpen={() => openTeam(team)}
              />
            ))}
          </div>
        ) : (
          <div className="gd-card px-6 py-12 text-center">
            <Search className="mx-auto mb-3 h-10 w-10 text-on-surface-variant" />
            <p className="font-display text-xl font-bold uppercase text-on-surface">No teams found</p>
            <p className="mt-1 text-sm text-on-surface-variant">Try adjusting your search or filters.</p>
            {(searchQuery || selectedConference !== 'all') && (
              <button type="button" className="mt-4 h-10 rounded-xl bg-surface-container-high px-4 font-semibold text-on-surface" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Custom team (FCS, D-II...) via My Teams' add dialog */}
        <div className="gd-card flex items-start gap-3 p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-brand-highlight">
            <GraduationCap className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-lg font-bold uppercase text-on-surface">Can&apos;t find your school?</p>
            <p className="mt-0.5 text-sm text-on-surface-variant">This list covers FBS programs. Add any other school by name from My Teams.</p>
            <button
              type="button"
              onClick={() => navigate(createPageUrl('MyTeams') + '?add=1')}
              className="mt-3 h-10 rounded-xl bg-surface-container-high px-4 font-display text-sm font-bold uppercase tracking-wide text-on-surface"
            >
              Add a team by name
            </button>
          </div>
        </div>
      </main>

    </div>
  );
}
