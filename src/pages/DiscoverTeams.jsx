import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Search, Star, Users, TrendingUp, X, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function DiscoverTeams() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConference, setSelectedConference] = useState('all');
  const [expandedTeam, setExpandedTeam] = useState(null);

  useEffect(() => {
    client.auth.me().then(setUser).catch(() => {});
  }, []);

  const favoriteTeams = user?.favorite_teams || [];

  const { data: schools = [] } = useQuery({
    queryKey: ['schools'],
    queryFn: () => client.entities.School.list(),
  });

  const { data: standingsData } = useQuery({
    queryKey: ['standings', selectedConference],
    queryFn: async () => {
      const response = await client.functions.invoke('fetchStandings', { 
        conference: selectedConference === 'all' ? 'fbs' : selectedConference 
      });
      return response.data;
    },
  });

  const conferences = useMemo(() => {
    const confs = new Set(schools.map(s => s.conference).filter(Boolean));
    return ['all', ...Array.from(confs).sort()];
  }, [schools]);

  const filteredSchools = useMemo(() => {
    let filtered = schools;

    if (selectedConference !== 'all') {
      filtered = filtered.filter(s => s.conference === selectedConference);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(query) ||
        s.mascot?.toLowerCase().includes(query) ||
        s.conference?.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [schools, selectedConference, searchQuery]);

  // Merge school data with standings
  const schoolsWithStats = useMemo(() => {
    if (!standingsData?.standings) return filteredSchools;

    return filteredSchools.map(school => {
      const stats = standingsData.standings.find(s => 
        s.team?.toLowerCase().includes(school.name.toLowerCase()) ||
        school.name.toLowerCase().includes(s.team?.toLowerCase())
      );
      return { ...school, stats };
    });
  }, [filteredSchools, standingsData]);

  const followMutation = useMutation({
    mutationFn: async (team) => {
      if (!user) {
        toast.error('Please log in to follow teams');
        client.auth.redirectToLogin();
        return;
      }

      const isFollowing = favoriteTeams.includes(team.name);
      const newFavorites = isFollowing
        ? favoriteTeams.filter(t => t !== team.name)
        : [...favoriteTeams, team.name];

      await client.auth.updateMe({ favorite_teams: newFavorites });

      // Update follower count
      await client.entities.School.update(team.id, {
        follower_count: Math.max((team.follower_count || 0) + (isFollowing ? -1 : 1), 0)
      });

      return { isFollowing, teamName: team.name };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['user']);
      queryClient.invalidateQueries(['schools']);
      client.auth.me().then(setUser);
      toast.success(data.isFollowing ? `Unfollowed ${data.teamName}` : `Following ${data.teamName}! 🎉`);
    },
  });

  const TeamCard = ({ school }) => {
    const isFollowing = favoriteTeams.includes(school.name);
    const isExpanded = expandedTeam === school.id;
    const stats = school.stats;

    const { data: detailedStats, isLoading: detailedStatsLoading } = useQuery({
      queryKey: ['detailed-stats', school.name],
      queryFn: async () => {
        const response = await client.functions.invoke('fetchTeamStats', { team_name: school.name });
        return response.data.stats;
      },
      enabled: isExpanded,
    });

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3 flex-1">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: school.primary_color || '#FF6B35' }}
              >
                {school.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900">{school.name}</h3>
                <p className="text-sm text-slate-500">{school.mascot}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {school.conference}
                  </Badge>
                  {school.follower_count > 0 && (
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Users className="w-3 h-3" />
                      <span>{school.follower_count}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <Button
              size="sm"
              variant={isFollowing ? "default" : "outline"}
              className={isFollowing ? "bg-orange-500 hover:bg-orange-600" : ""}
              onClick={() => followMutation.mutate(school)}
              disabled={followMutation.isPending}
            >
              <Star className={`w-4 h-4 mr-1 ${isFollowing ? 'fill-white' : ''}`} />
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
          </div>

          {stats && (
            <div className="bg-slate-50 rounded-xl p-3 mb-3">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.wins || 0}</p>
                  <p className="text-xs text-slate-600">Wins</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.losses || 0}</p>
                  <p className="text-xs text-slate-600">Losses</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-600">
                    {stats.win_percentage ? (stats.win_percentage * 100).toFixed(0) : 0}%
                  </p>
                  <p className="text-xs text-slate-600">Win Rate</p>
                </div>
              </div>
              {stats.conference_record && (
                <p className="text-xs text-slate-500 text-center mt-2">
                  Conference: {stats.conference_record}
                </p>
              )}
            </div>
          )}

          {/* Expanded Stats Section */}
          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              {detailedStatsLoading ? (
                <div className="space-y-2">
                  <div className="h-16 bg-slate-100 rounded animate-pulse" />
                  <div className="h-16 bg-slate-100 rounded animate-pulse" />
                </div>
              ) : detailedStats ? (
                <div className="space-y-3">
                  {/* Rankings */}
                  {detailedStats.rankings && (
                    <div className="grid grid-cols-2 gap-2">
                      {detailedStats.rankings.national_rank && detailedStats.rankings.national_rank <= 25 && (
                        <div className="bg-orange-50 rounded-lg p-2 text-center">
                          <p className="text-xs text-orange-600">National</p>
                          <p className="text-lg font-bold text-orange-900">#{detailedStats.rankings.national_rank}</p>
                        </div>
                      )}
                      <div className="bg-blue-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-blue-600">Off. Rank</p>
                        <p className="text-lg font-bold text-blue-900">#{detailedStats.rankings.offense_rank}</p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-red-600">Def. Rank</p>
                        <p className="text-lg font-bold text-red-900">#{detailedStats.rankings.defense_rank}</p>
                      </div>
                    </div>
                  )}

                  {/* Current Season Snapshot */}
                  {detailedStats.current_season && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-slate-600">PPG</p>
                          <p className="font-bold text-green-600">{detailedStats.current_season.points_per_game?.toFixed(1)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-600">Allowed</p>
                          <p className="font-bold text-red-600">{detailedStats.current_season.points_allowed_per_game?.toFixed(1)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Trends */}
                  {detailedStats.trends && (
                    <div className="text-sm text-slate-700">
                      <p className="font-semibold mb-1">Current Form:</p>
                      <p>{detailedStats.trends.current_streak}</p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setExpandedTeam(isExpanded ? null : school.id)}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
              {isExpanded ? 'Less' : 'More Stats'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => navigate(createPageUrl('TeamPage') + `?team=${encodeURIComponent(school.name)}`)}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Full Profile
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="gd-page">
      {/* Header */}
      <div className="gd-header px-4 pt-12 pb-6 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => navigate(createPageUrl('Home'))}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Discover Teams</h1>
            <p className="text-white/90 text-sm">Follow your favorite teams</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search teams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/70"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-white/70 hover:text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Conference Filter */}
      <div className="px-4 py-3 bg-white border-b border-gray-200 overflow-x-auto sticky top-[160px] z-10">
        <div className="flex gap-2">
          {conferences.map(conf => (
            <Badge
              key={conf}
              variant={selectedConference === conf ? "default" : "outline"}
              className={`cursor-pointer capitalize shrink-0 ${
                selectedConference === conf 
                  ? 'bg-orange-500 hover:bg-orange-600'
                  : 'hover:bg-slate-100'
              }`}
              onClick={() => setSelectedConference(conf)}
            >
              {conf === 'all' ? 'All Conferences' : conf}
            </Badge>
          ))}
        </div>
      </div>

      {/* Teams Grid */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-900">
            {filteredSchools.length} {filteredSchools.length === 1 ? 'Team' : 'Teams'}
          </h2>
          {user && favoriteTeams.length > 0 && (
            <button 
              onClick={() => navigate(createPageUrl('MyTeams'))}
              className="text-sm text-orange-500 font-semibold flex items-center gap-1"
            >
              <Star className="w-4 h-4 fill-orange-500" />
              My Teams ({favoriteTeams.length})
            </button>
          )}
        </div>

        {schoolsWithStats.length > 0 ? (
          <div className="grid gap-3">
            {schoolsWithStats.map(school => (
              <TeamCard key={school.id} school={school} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl">
            <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 mb-2">No teams found</p>
            <p className="text-sm text-slate-500">Try adjusting your search or filters</p>
            {(searchQuery || selectedConference !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedConference('all');
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}