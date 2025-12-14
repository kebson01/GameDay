import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTeamSchedule, fetchTeamNews, POPULAR_TEAMS } from '@/lib/sportsApi';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, Newspaper, Star, ChevronRight, ExternalLink, X, Tv
} from 'lucide-react';
import { auth } from '@/lib/auth';
import { toast } from 'sonner';

export default function TeamDetailView({ team, isOpen, onClose, onArticleClick }) {
  const [activeTab, setActiveTab] = useState('schedule');
  
  // Get team data from POPULAR_TEAMS for correct ID
  const teamData = team?.id 
    ? team 
    : POPULAR_TEAMS.find(t => t.name === team?.name) || team;
  
  const teamId = teamData?.id;

  // Fetch team schedule
  const { data: schedule = [], isLoading: scheduleLoading } = useQuery({
    queryKey: ['team-schedule', teamId],
    queryFn: () => fetchTeamSchedule(teamId),
    enabled: !!teamId && isOpen,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch team news
  const { data: news = [], isLoading: newsLoading } = useQuery({
    queryKey: ['team-news', teamId],
    queryFn: () => fetchTeamNews(teamId, 10),
    enabled: !!teamId && isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const wins = schedule.filter(g => g.result?.won).length;
  const losses = schedule.filter(g => g.result && !g.result.won).length;
  const remaining = schedule.filter(g => g.status === 'upcoming').length;

  const handleFollow = async () => {
    try {
      const user = await auth.me();
      if (!user) {
        toast.error('Please sign in to follow teams');
        return;
      }
      const currentFavorites = user.favorite_teams || [];
      if (currentFavorites.includes(teamData?.name)) {
        toast.info('Already following this team');
        return;
      }
      await auth.updateMe({ favorite_teams: [...currentFavorites, teamData?.name] });
      toast.success(`Now following ${teamData?.name}!`);
    } catch (error) {
      toast.error('Please sign in to follow teams');
    }
  };

  const handleClose = () => {
    setActiveTab('schedule'); // Reset tab
    onClose();
  };

  if (!team) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl overflow-hidden flex flex-col">
        {/* Header */}
        <SheetHeader className="pb-4 border-b flex-shrink-0">
          <SheetTitle className="flex items-center gap-4">
            {teamId && (
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                <img 
                  src={`https://a.espncdn.com/i/teamlogos/ncaa/500/${teamId}.png`}
                  alt={teamData?.name}
                  className="w-14 h-14 object-contain"
                />
              </div>
            )}
            <div className="flex-1">
              <span className="block text-xl">{teamData?.name || team?.name}</span>
              <div className="flex items-center gap-2 mt-1">
                {teamData?.conference && (
                  <Badge variant="outline" className="text-xs">{teamData.conference}</Badge>
                )}
                {schedule.length > 0 && (
                  <Badge className="bg-green-500 text-xs">
                    {wins}-{losses}
                  </Badge>
                )}
              </div>
            </div>
          </SheetTitle>
        </SheetHeader>

        {/* Tab Navigation */}
        <div className="flex gap-2 pt-4 pb-2 border-b flex-shrink-0">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors ${
              activeTab === 'schedule'
                ? 'bg-orange-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Calendar className="w-5 h-5" />
            Schedule
          </button>
          <button
            onClick={() => setActiveTab('news')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-colors ${
              activeTab === 'news'
                ? 'bg-orange-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Newspaper className="w-5 h-5" />
            News
            {news.length > 0 && (
              <Badge className="bg-white/20 text-xs px-1.5">{news.length}</Badge>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {scheduleLoading || newsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
            </div>
          ) : activeTab === 'schedule' ? (
            <>
              {/* Season Record Summary */}
              {schedule.length > 0 && (
                <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-4 text-white">
                  <h3 className="text-sm font-medium opacity-90 mb-2">{new Date().getFullYear()} Season</h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-3xl font-bold">{wins}</p>
                      <p className="text-xs opacity-80">Wins</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold">{losses}</p>
                      <p className="text-xs opacity-80">Losses</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold">{remaining}</p>
                      <p className="text-xs opacity-80">Remaining</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Schedule */}
              <div>
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-orange-500" />
                  Schedule
                </h3>
                
                {schedule.length > 0 ? (
                  <div className="space-y-2">
                    {schedule.map((game, idx) => {
                      const isWin = game.result?.won === true;
                      const isLoss = game.result && !game.result.won;
                      const isLive = game.status === 'live';
                      
                      return (
                        <div
                          key={game.id || idx}
                          className={`flex items-center gap-3 p-3 rounded-xl border ${
                            isWin ? 'border-green-200 bg-green-50' :
                            isLoss ? 'border-red-200 bg-red-50' :
                            isLive ? 'border-red-300 bg-red-50' :
                            'border-slate-200 bg-white'
                          }`}
                        >
                          {/* Opponent Logo */}
                          <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                            <img 
                              src={game.opponent_logo || `https://a.espncdn.com/i/teamlogos/ncaa/500/${game.opponent_id || '0'}.png`}
                              alt={game.opponent} 
                              className="w-8 h-8 object-contain"
                            />
                          </div>
                          
                          {/* Game Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-slate-500">{game.is_home ? 'vs' : '@'}</span>
                              {game.opponent_rank && (
                                <span className="text-xs font-bold text-orange-500">#{game.opponent_rank}</span>
                              )}
                              <span className="font-medium text-slate-900 truncate">{game.opponent}</span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {game.game_date}
                              {game.status === 'upcoming' && ` • ${game.time}`}
                              {game.tv_network && ` • ${game.tv_network}`}
                            </div>
                          </div>
                          
                          {/* Result */}
                          <div className="text-right flex-shrink-0">
                            {isLive ? (
                              <Badge className="bg-red-500 animate-pulse">LIVE</Badge>
                            ) : game.result ? (
                              <div className="text-right">
                                <Badge className={`${isWin ? 'bg-green-500' : 'bg-red-500'} mb-1`}>
                                  {isWin ? 'W' : 'L'}
                                </Badge>
                                <p className="text-sm font-bold text-slate-700">
                                  {game.result.team_score}-{game.result.opponent_score}
                                </p>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">Upcoming</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-slate-50 rounded-xl">
                    <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500">No schedule available</p>
                  </div>
                )}
              </div>

              {/* Follow Button */}
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600"
                onClick={handleFollow}
              >
                <Star className="w-4 h-4 mr-2" />
                Follow {teamData?.name}
              </Button>
            </>
          ) : (
            /* News Tab */
            <>
              {news.length > 0 ? (
                <div className="space-y-3">
                  {news.map((article, idx) => (
                    <button
                      key={article.id || idx}
                      className="w-full bg-white border border-slate-200 rounded-xl overflow-hidden text-left hover:bg-slate-50 hover:border-orange-200 transition-colors"
                      onClick={() => onArticleClick?.(article)}
                    >
                      <div className="flex gap-3 p-3">
                        {article.image && (
                          <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                            <img 
                              src={article.image} 
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-slate-900 text-sm line-clamp-2 mb-1">
                            {article.headline}
                          </h4>
                          {article.description && (
                            <p className="text-xs text-slate-500 line-clamp-2 mb-2">
                              {article.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-400">
                              {article.publishedFormatted || article.source}
                            </span>
                            <ChevronRight className="w-4 h-4 text-orange-500" />
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-50 rounded-xl">
                  <Newspaper className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium">No news available</p>
                  <p className="text-sm text-slate-500 mt-1">Check back later for updates</p>
                </div>
              )}

              {/* Follow Button */}
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600"
                onClick={handleFollow}
              >
                <Star className="w-4 h-4 mr-2" />
                Follow {teamData?.name}
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Article View Component
export function ArticleView({ article, isOpen, onClose }) {
  if (!article) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl overflow-hidden flex flex-col">
        <SheetHeader className="pb-4 border-b flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-orange-500" />
            Article
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Article Image */}
          {article.image && (
            <div className="w-full aspect-video rounded-2xl overflow-hidden bg-slate-100">
              <img 
                src={article.image} 
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          {/* Headline */}
          <h1 className="text-xl font-bold text-slate-900 leading-tight">
            {article.headline}
          </h1>
          
          {/* Meta info */}
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span className="font-medium text-orange-600">{article.source || 'ESPN'}</span>
            <span>•</span>
            <span>
              {article.published 
                ? new Date(article.published).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })
                : 'Recent'
              }
            </span>
          </div>
          
          {/* Description/Summary */}
          {article.description && (
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-slate-700 leading-relaxed">
                {article.description}
              </p>
            </div>
          )}
          
          {/* Read Full Article Button */}
          {article.link && (
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full p-4 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
              Read Full Article on ESPN
            </a>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}




