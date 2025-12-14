import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Newspaper, TrendingUp, Trophy, Users, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const categoryConfig = {
  game_result: { icon: Trophy, color: 'bg-green-100 text-green-700', label: 'Game Result' },
  upcoming: { icon: Calendar, color: 'bg-blue-100 text-blue-700', label: 'Upcoming' },
  player_news: { icon: Users, color: 'bg-purple-100 text-purple-700', label: 'Player News' },
  rankings: { icon: TrendingUp, color: 'bg-orange-100 text-orange-700', label: 'Rankings' },
  team_news: { icon: Newspaper, color: 'bg-slate-100 text-slate-700', label: 'Team News' },
};

export default function NewsFeed({ teamName, compact = false }) {
  const { data, isLoading } = useQuery({
    queryKey: ['team-news', teamName],
    queryFn: async () => {
      const response = await client.functions.invoke('fetchTeamNews', { team_name: teamName });
      return response.data;
    },
    enabled: !!teamName,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  
  if (!teamName) return null;
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Newspaper className="w-5 h-5 text-slate-600" />
          <h3 className="font-bold text-slate-900">Latest News</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-full mb-1" />
              <div className="h-3 bg-slate-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  const newsItems = data?.news || [];
  const displayItems = compact ? newsItems.slice(0, 3) : newsItems;
  
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Newspaper className="w-5 h-5 text-slate-600" />
        <h3 className="font-bold text-slate-900">Latest News - {teamName}</h3>
      </div>
      
      {newsItems.length > 0 ? (
        <div className="space-y-4">
          {displayItems.map((item, idx) => {
            const config = categoryConfig[item.category] || categoryConfig.team_news;
            const Icon = config.icon;
            
            return (
              <div key={idx} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl ${config.color} flex items-center justify-center shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={`text-xs ${config.color} border-0`}>
                        {config.label}
                      </Badge>
                      <span className="text-xs text-slate-500">{item.date}</span>
                    </div>
                    <h4 className="font-semibold text-slate-900 mb-1 leading-tight">
                      {item.headline}
                    </h4>
                    {item.score && (
                      <p className="text-sm font-bold text-orange-600 mb-1">{item.score}</p>
                    )}
                    <p className="text-sm text-slate-600 leading-relaxed">{item.summary}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500">
          <Newspaper className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="text-sm">No recent news available</p>
        </div>
      )}
    </div>
  );
}