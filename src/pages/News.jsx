import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, X, RefreshCw, Newspaper, Film, Trophy, ChevronRight, LayoutGrid, TrendingUp, TrendingDown } from 'lucide-react';
import { fetchNews, fetchRankings } from '@/lib/sportsApi';
import { createPageUrl } from '@/utils';
import AppHeader from '@/components/layout/AppHeader';
import VideoStorySheet from '@/components/video/VideoStorySheet';
import SafetyButton from '@/components/common/SafetyButton';
import { Skeleton } from '@/components/common/LoadingSkeleton';
import { LeadStory, StoryRow } from '@/components/feed-v2/NewsStory';

export default function News() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  // ?filter=videos (e.g. from Home's Highlights "See All") opens the Videos filter
  const [filter, setFilter] = useState(() =>
    new URLSearchParams(window.location.search).get('filter') === 'videos' ? 'videos' : 'all'
  ); // 'all' | 'videos'
  const [selectedVideo, setSelectedVideo] = useState(null);

  // Fetch news from ESPN
  const { data: news = [], isLoading: newsLoading, isFetching, refetch } = useQuery({
    queryKey: ['cfb-news'],
    queryFn: () => fetchNews(40),
    staleTime: 60000, // 1 minute
  });

  // AP poll for the Top 5 strip
  const { data: rankings = [] } = useQuery({
    queryKey: ['rankings'],
    queryFn: fetchRankings,
    staleTime: 300000,
  });

  const videoCount = news.filter(a => a.is_video).length;
  const q = searchQuery.trim().toLowerCase();
  const filteredNews = news.filter(article =>
    (filter === 'all' || article.is_video) && (
      !q ||
      article.headline?.toLowerCase().includes(q) ||
      article.description?.toLowerCase().includes(q))
  );
  // Lead story: the newest story with a photo
  const lead = filteredNews.find(a => a.image) || null;
  const rest = filteredNews.filter(a => a !== lead);

  // Video stories open in-app; the clip itself plays on ESPN over the app
  const openVideoStory = (article) => setSelectedVideo({
    id: article.id,
    headline: article.headline,
    description: article.description,
    thumbnail: article.image,
    url: article.link,
    published: article.published,
    premium: article.premium,
    source: article.source,
  });

  return (
    <div className="gd-page">
      <AppHeader
        eyebrow="Saturday Live"
        title="CFB News Wire"
        subtitle="Powered by ESPN"
        back="Home"
        actions={
          <>
            <button
              type="button"
              aria-label={showSearch ? 'Close search' : 'Search news'}
              onClick={() => { setShowSearch(v => !v); setSearchQuery(''); }}
              className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface"
            >
              {showSearch ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </button>
            <button
              type="button"
              aria-label="Refresh news"
              onClick={() => refetch()}
              className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface"
            >
              <RefreshCw className={`h-5 w-5 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </>
        }
      >
        {showSearch && (
          <input
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search news…"
            className="gd-input"
            aria-label="Search news"
          />
        )}
      </AppHeader>

      <main className="space-y-4 px-4 pt-4">
        {/* All / Videos */}
        <div className="gd-chip-row" role="tablist" aria-label="Filter news">
          {[
            { value: 'all', label: 'All News', icon: LayoutGrid },
            { value: 'videos', label: `Videos${videoCount ? ` (${videoCount})` : ''}`, icon: Film },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              onClick={() => setFilter(value)}
              className="gd-chip"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {newsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-[300px] w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="gd-card px-6 py-12 text-center">
            <Newspaper className="mx-auto mb-3 h-10 w-10 text-orange-500" />
            <p className="font-display text-xl font-bold uppercase text-on-surface">
              {q ? 'No matching stories' : filter === 'videos' ? 'No videos right now' : 'No news available'}
            </p>
            <p className="mt-1 text-sm text-on-surface-variant">
              {q ? 'Try a different search.' : 'Tap refresh or check back soon.'}
            </p>
          </div>
        ) : (
          <>
            {lead && <LeadStory article={lead} onOpenVideo={openVideoStory} />}

            {/* AP Top 5 */}
            {rankings.length > 0 && !q && (
              <section className="gd-card p-3.5" aria-label="AP Top 5">
                <div className="mb-2.5 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-display text-lg font-bold uppercase tracking-wide text-on-surface">
                    <Trophy className="h-4 w-4 text-amber-600 dark:text-brand-highlight" />
                    AP Top 5
                  </h2>
                  <button
                    type="button"
                    onClick={() => navigate(createPageUrl('Schedule') + '?tab=rankings')}
                    className="flex items-center gap-0.5 text-sm font-semibold text-orange-600 dark:text-brand-soft"
                  >
                    Full poll <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <ol className="-mx-3.5 flex gap-2 overflow-x-auto px-3.5 pb-0.5 [scrollbar-width:none]">
                  {rankings.slice(0, 5).map((team) => (
                    <li
                      key={team.rank}
                      className="flex w-[92px] shrink-0 flex-col items-center rounded-xl bg-surface-container-high px-2 pb-2 pt-2.5 dark:bg-surface"
                    >
                      <span className="relative">
                        {team.logo ? (
                          <img src={team.logo} alt="" className="h-10 w-10 object-contain" />
                        ) : (
                          <span className="block h-10 w-10 rounded-full bg-surface-container-highest" />
                        )}
                        <span className="absolute -left-2.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 font-display text-xs font-bold text-white">
                          {team.rank}
                        </span>
                      </span>
                      <span className="mt-1.5 line-clamp-2 min-h-[2.2em] w-full text-center font-display text-[13px] font-bold uppercase leading-[1.1] text-on-surface">
                        {team.team}
                      </span>
                      <span className="flex items-center gap-0.5 text-[11px] font-semibold text-on-surface-variant tabular-nums">
                        {team.record}
                        {team.trend === 'up' && <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-brand-win" aria-label="Moved up" />}
                        {team.trend === 'down' && <TrendingDown className="h-3 w-3 text-red-600" aria-label="Moved down" />}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {rest.length > 0 && (
              <section className="space-y-3">
                <h2 className="flex items-center justify-between pt-1 font-display text-lg font-bold uppercase tracking-wide text-on-surface">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-brand" />
                    {filter === 'videos' ? 'Video Wire' : 'Trending Wire'}
                  </span>
                  <span className="text-xs font-semibold normal-case text-on-surface-variant">{rest.length} {rest.length === 1 ? 'story' : 'stories'}</span>
                </h2>
                {rest.map((article, idx) => (
                  <StoryRow key={article.id || idx} article={article} onOpenVideo={openVideoStory} />
                ))}
              </section>
            )}
          </>
        )}
      </main>

      <VideoStorySheet
        video={selectedVideo}
        open={!!selectedVideo}
        onOpenChange={(open) => !open && setSelectedVideo(null)}
      />

      <SafetyButton />
    </div>
  );
}
