import React, { useMemo } from 'react';
import { TrendingUp, MessageCircle, Flame } from 'lucide-react';

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
        topicMap[topic].engagement += (post.like_count ?? post.likes?.length ?? 0) + (post.comment_count || 0);
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
          topicMap[keyword].engagement += (post.like_count ?? post.likes?.length ?? 0) + (post.comment_count || 0);
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
    <section aria-label="Trending in the fan feed">
      <div className="mb-2 flex items-center gap-2">
        <Flame className="h-4 w-4 text-orange-500" />
        <h3 className="font-display text-base font-bold uppercase tracking-wide text-on-surface">Trending in the feed</h3>
      </div>
      <div className="gd-chip-row">
        {trendingTopics.map((topic, idx) => (
          <span
            key={idx}
            className="inline-flex h-8 shrink-0 items-center gap-2 rounded-full border border-outline-variant bg-surface-container px-3.5 text-sm dark:border-white/[0.08]"
          >
            <span className="font-display font-bold uppercase tracking-wide text-orange-600 dark:text-brand-soft">
              {topic.type === 'hashtag' ? topic.name : `#${topic.name}`}
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-on-surface-variant">
              <MessageCircle className="h-3 w-3" />
              {topic.count}
            </span>
            {topic.engagement > 10 && <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-brand-win" aria-label="Hot topic" />}
          </span>
        ))}
      </div>
    </section>
  );
}
