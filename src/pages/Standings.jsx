import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Trophy, Heart } from 'lucide-react';
import { client } from '@/api/client';
import { auth } from '@/lib/auth';
import { getCurrentSeason, fetchRankings } from '@/lib/sportsApi';
import AppHeader from '@/components/layout/AppHeader';
import SafetyButton from '@/components/common/SafetyButton';
import { Skeleton } from '@/components/common/LoadingSkeleton';
import StandingsTable from '@/components/feed-v2/StandingsTable';
import { sortStandings } from '@/lib/feedData';

// Preferred chip order; any other conference in the data follows alphabetically
const CONFERENCE_ORDER = ['SEC', 'Big Ten', 'ACC', 'Big 12', 'Pac-12', 'American', 'Mountain West', 'Sun Belt', 'MAC', 'Conference USA', 'Independent'];
const CHIP_LABEL = { 'Conference USA': 'C-USA' };

export default function Standings() {
  const [selectedConference, setSelectedConference] = useState('all');
  const [sortMode, setSortMode] = useState('conf'); // 'conf' | 'overall'
  const [favoriteTeams, setFavoriteTeams] = useState([]);

  useEffect(() => {
    auth.me().then(u => setFavoriteTeams(u?.favorite_teams || [])).catch(() => {});
  }, []);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['standings', selectedConference],
    queryFn: async () => {
      const response = await client.functions.invoke('fetchStandings', {
        conference: selectedConference === 'all' ? null : selectedConference
      });
      return response.data;
    },
  });

  // AP ranks to tag ranked teams in the table
  const { data: rankings = [] } = useQuery({
    queryKey: ['rankings'],
    queryFn: fetchRankings,
    staleTime: 300000,
  });
  const apRanks = useMemo(
    () => Object.fromEntries(rankings.filter(r => r.team_id).map(r => [r.team_id, r.rank])),
    [rankings]
  );

  // Group standings by conference
  const groupedStandings = useMemo(() => {
    const grouped = {};
    (data?.standings || []).forEach(team => {
      if (!team.conference) return;
      (grouped[team.conference] ||= []).push(team);
    });
    Object.keys(grouped).forEach(conf => { grouped[conf] = sortStandings(grouped[conf], sortMode); });
    return grouped;
  }, [data, sortMode]);

  const allConferences = useMemo(() => {
    const names = Object.keys(groupedStandings);
    const rank = (n) => { const i = CONFERENCE_ORDER.indexOf(n); return i < 0 ? 99 : i; };
    return names.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  }, [groupedStandings]);

  const conferences = selectedConference === 'all' ? allConferences : [selectedConference];

  const favoriteIds = useMemo(() => {
    if (!favoriteTeams.length) return [];
    const favs = favoriteTeams.map(t => t.toLowerCase());
    return (data?.standings || [])
      .filter(t => favs.some(f => t.team_name?.toLowerCase() === f || t.team_name?.toLowerCase().includes(f)))
      .map(t => t.team_id);
  }, [data, favoriteTeams]);

  return (
    <div className="gd-page">
      <AppHeader
        eyebrow="Saturday Live"
        title="Standings"
        subtitle={`${getCurrentSeason()} FBS season`}
        back="Home"
        actions={
          <button
            type="button"
            aria-label="Refresh standings"
            onClick={() => refetch()}
            className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface"
          >
            <RefreshCw className={`h-5 w-5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      <main className="space-y-4 px-4 pt-4">
        {/* Conference chips */}
        <div className="gd-chip-row" role="toolbar" aria-label="Conference">
          <button type="button" className="gd-chip" aria-pressed={selectedConference === 'all'} onClick={() => setSelectedConference('all')}>
            <Trophy className="h-3.5 w-3.5" />
            All
          </button>
          {allConferences.map(conf => (
            <button
              key={conf}
              type="button"
              className="gd-chip"
              aria-pressed={selectedConference === conf}
              onClick={() => setSelectedConference(conf)}
            >
              {CHIP_LABEL[conf] || conf}
            </button>
          ))}
        </div>

        {/* Sort: conference vs overall record */}
        <div className="flex items-center gap-3">
          <div className="gd-segment flex-1 grid-cols-2" role="tablist" aria-label="Sort standings by">
            <button type="button" role="tab" aria-selected={sortMode === 'conf'} onClick={() => setSortMode('conf')}>
              Conf Record
            </button>
            <button type="button" role="tab" aria-selected={sortMode === 'overall'} onClick={() => setSortMode('overall')}>
              Overall
            </button>
          </div>
          {favoriteIds.length > 0 && (
            <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-on-surface-variant">
              <span className="h-3 w-1 rounded-full bg-brand" />
              <Heart className="h-3 w-3 text-orange-500" />
              Your teams
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-96 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        ) : !allConferences.length ? (
          <div className="gd-card px-6 py-12 text-center">
            <Trophy className="mx-auto mb-3 h-10 w-10 text-orange-500" />
            <p className="font-display text-xl font-bold uppercase text-on-surface">Standings unavailable</p>
            <p className="mt-1 text-sm text-on-surface-variant">ESPN didn&apos;t return standings. Try refreshing.</p>
          </div>
        ) : (
          conferences.map(conf => (
            <StandingsTable
              key={conf}
              conference={conf}
              teams={groupedStandings[conf] || []}
              apRanks={apRanks}
              mode={sortMode}
              highlightIds={favoriteIds}
            />
          ))
        )}

        {!isLoading && allConferences.length > 0 && (
          <p className="px-1 pb-2 text-center text-xs text-on-surface-variant">
            Sorted by {sortMode === 'conf' ? 'conference' : 'overall'} win %. Pct = overall win %. #N = AP rank. Data: ESPN.
          </p>
        )}
      </main>

      <SafetyButton />
    </div>
  );
}
