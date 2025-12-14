import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchNews, fetchRankings } from '@/lib/sportsApi';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Search, ExternalLink, Clock, Trophy, RefreshCw, Newspaper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import SafetyButton from '@/components/common/SafetyButton';
import { Skeleton } from '@/components/common/LoadingSkeleton';

export default function News() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Fetch news from ESPN
  const { data: news = [], isLoading: newsLoading, refetch } = useQuery({
    queryKey: ['cfb-news'],
    queryFn: () => fetchNews(20),
    staleTime: 60000, // 1 minute
  });

  // Fetch rankings for sidebar
  const { data: rankings = [] } = useQuery({
    queryKey: ['rankings'],
    queryFn: fetchRankings,
    staleTime: 300000,
  });

  const filteredNews = news.filter(article =>
    !searchQuery || 
    article.headline?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  return (
    <div className="gd-page">
      {/* Header */}
      <div className="gd-header px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/20"
              onClick={() => navigate(createPageUrl('Home'))}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">College Football News</h1>
              <p className="text-white/80 text-sm">Powered by ESPN</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => refetch()}
          >
            <RefreshCw className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search news..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
          />
        </div>
      </div>
      
      <div className="px-4 py-4 space-y-4">
        {/* Top 5 Rankings Quick View */}
        {rankings.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-orange-500" />
                AP Top 5
              </h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate(createPageUrl('Schedule'))}
              >
                See All
              </Button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {rankings.slice(0, 5).map((team) => (
                <div key={team.rank} className="flex flex-col items-center shrink-0">
                  <div className="relative">
                    {team.logo ? (
                      <img src={team.logo} alt="" className="w-12 h-12 object-contain" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-200" />
                    )}
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                      {team.rank}
                    </div>
                  </div>
                  <span className="text-xs text-slate-600 mt-1 text-center max-w-[60px] truncate">
                    {team.team?.split(' ').pop()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* News Feed */}
        <div className="space-y-4">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-blue-500" />
            Latest News
          </h2>

          {newsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
                  <Skeleton className="h-40 w-full rounded-xl mb-3" />
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ))}
            </div>
          ) : filteredNews.length > 0 ? (
            <div className="space-y-4">
              {filteredNews.map((article, idx) => (
                <a
                  key={article.id || idx}
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  {article.image && (
                    <div className="relative h-48">
                      <img 
                        src={article.image} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <Badge className="absolute top-3 left-3 bg-blue-500">
                        {article.source}
                      </Badge>
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-bold text-slate-900 mb-2 line-clamp-2">
                      {article.headline}
                    </h3>
                    {article.description && (
                      <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                        {article.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(article.published)}
                      </span>
                      <span className="text-xs text-blue-500 flex items-center gap-1">
                        Read more
                        <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl">
              <Newspaper className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">
                {searchQuery ? 'No articles match your search' : 'No news available'}
              </p>
            </div>
          )}
        </div>
      </div>
      
      <SafetyButton />
    </div>
  );
}
