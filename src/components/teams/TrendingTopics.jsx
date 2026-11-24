import React, { useMemo } from 'react';
import { TrendingUp, MessageCircle, Flame } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function TrendingTopics({ posts }) {
  const trendingTopics = useMemo(() => {
    if (!posts || posts.length === 0) return [];

    // Extract hashtags and keywords from posts
    const topicMap = {};
    const recentPosts = posts.slice(0, 20); // Last 20 posts

    recentPosts.forEach(post => {
      // Extract hashtags
      const hashtags = post.content.match(/#\w+/g) || [];
      hashtags.forEach(tag => {
        const topic = tag.toLowerCase();
        if (!topicMap[topic]) {
          topicMap[topic] = { name: tag, count: 0, engagement: 0, type: 'hashtag' };
        }
        topicMap[topic].count++;
        topicMap[topic].engagement += (post.likes?.length || 0) + (post.comment_count || 0);
      });

      // Common football keywords
      const keywords = ['win', 'victory', 'touchdown', 'defense', 'offense', 'playoff', 'championship', 'rivalry', 'comeback', 'upset'];
      const contentLower = post.content.toLowerCase();
      keywords.forEach(keyword => {
        if (contentLower.includes(keyword)) {
          if (!topicMap[keyword]) {
            topicMap[keyword] = { name: keyword, count: 0, engagement: 0, type: 'keyword' };
          }
          topicMap[keyword].count++;
          topicMap[keyword].engagement += (post.likes?.length || 0) + (post.comment_count || 0);
        }
      });
    });

    // Sort by engagement score
    return Object.values(topicMap)
      .filter(topic => topic.count >= 2) // At least 2 mentions
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 5);
  }, [posts]);

  if (trendingTopics.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-4 border border-orange-200">
      <div className="flex items-center gap-2 mb-3">
        <Flame className="w-5 h-5 text-orange-600" />
        <h3 className="font-bold text-slate-900">Trending Now</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {trendingTopics.map((topic, idx) => (
          <Badge 
            key={idx} 
            variant="outline"
            className="bg-white/80 backdrop-blur hover:bg-surface-container transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-orange-600 capitalize">
                {topic.name}
              </span>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <MessageCircle className="w-3 h-3" />
                <span>{topic.count}</span>
              </div>
              {topic.engagement > 10 && (
                <TrendingUp className="w-3 h-3 text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
          </Badge>
        ))}
      </div>
    </div>
  );
}