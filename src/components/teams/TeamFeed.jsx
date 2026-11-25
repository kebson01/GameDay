import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import {
  Heart, MessageCircle, Share2, Send, Trophy,
  Newspaper, TrendingUp, Sparkles, ExternalLink, Video, Upload, Flag, Play, Trash2, X, LayoutGrid
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { isCloudEnabled } from '@/lib/supabase';
import { subscribeToTeamPosts } from '@/lib/cloudEntities';
import { cn } from '@/lib/utils';
import FeedAvatar from '@/components/feed-v2/FeedAvatar';
import TrendingTopics from './TrendingTopics.jsx';
import ModerationPanel from './ModerationPanel.jsx';

const timeAgo = (date) => {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return '';
  }
};

// Comments under a post (loaded when the post's comment area is opened)
function CommentList({ postId, user, onDeleted }) {
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['team-comments', postId],
    queryFn: () => client.entities.TeamComment.filter({ post_id: postId }, 'created_date', 100),
    refetchInterval: 15000,
  });
  if (isLoading) return <p className="py-2 text-xs text-on-surface-variant">Loading comments…</p>;
  if (!comments.length) return <p className="py-2 text-xs text-on-surface-variant">No comments yet. Start the conversation!</p>;
  return (
    <ul className="mb-3 space-y-2.5">
      {comments.map((c) => {
        const mine = c.is_own || (user && c.user_email && c.user_email === user.email);
        return (
          <li key={c.id} className="flex items-start gap-2">
            <FeedAvatar src={c.user_avatar} name={c.user_name} size="sm" className="ring-1" />
            <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md bg-surface-container-high px-3 py-2 dark:bg-surface">
              <p className="text-xs">
                <span className="font-bold text-on-surface">{c.user_name || 'Fan'}</span>
                <span className="text-on-surface-variant"> · {timeAgo(c.created_date)}</span>
              </p>
              <p className="whitespace-pre-wrap break-words text-sm text-on-surface">{c.content}</p>
            </div>
            {mine && (
              <button
                type="button"
                aria-label="Delete comment"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:text-red-500"
                onClick={async () => {
                  try {
                    await client.entities.TeamComment.delete(c.id);
                    onDeleted?.();
                  } catch (e) {
                    toast.error(e.message);
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

const POST_TYPES = {
  discussion: { icon: MessageCircle, pill: 'bg-sky-500/15 text-sky-700 dark:text-sky-300', label: 'Discussion' },
  news: { icon: Newspaper, pill: 'bg-violet-500/15 text-violet-700 dark:text-violet-300', label: 'News' },
  prediction: { icon: TrendingUp, pill: 'bg-brand/15 text-orange-700 dark:text-brand-soft', label: 'Prediction' },
  celebration: { icon: Trophy, pill: 'bg-emerald-500/15 text-emerald-700 dark:text-brand-win', label: 'Celebration' },
  highlight: { icon: Video, pill: 'bg-red-500/15 text-red-700', label: 'Highlight' },
};

export default function TeamFeed({ teamName, user }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newPost, setNewPost] = useState('');
  const [postType, setPostType] = useState('discussion');
  const [newsUrl, setNewsUrl] = useState('');
  const [newsTitle, setNewsTitle] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [showNewPost, setShowNewPost] = useState(false);
  const [commentingOn, setCommentingOn] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [isLive, setIsLive] = useState(false);
  const refreshTimer = useRef(null);
  const [typeFilter, setTypeFilter] = useState('all'); // post-type chip filter (view only)

  // Realtime: refresh the feed (and open comment threads) the moment another
  // fan posts, likes, comments, or a post is hidden/deleted
  useEffect(() => {
    if (!isCloudEnabled() || !teamName) return undefined;
    const unsubscribe = subscribeToTeamPosts(
      teamName,
      (payload) => {
        clearTimeout(refreshTimer.current); // batch bursts (e.g. several likes)
        refreshTimer.current = setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['team-posts', teamName] });
          const postId = payload.new?.id;
          if (postId) queryClient.invalidateQueries({ queryKey: ['team-comments', postId] });
        }, 250);
      },
      setIsLive
    );
    return () => {
      clearTimeout(refreshTimer.current);
      unsubscribe();
    };
  }, [teamName, queryClient]);

  const { data: posts = [] } = useQuery({
    queryKey: ['team-posts', teamName],
    queryFn: async () => {
      const allPosts = await client.entities.TeamPost.filter({ team_name: teamName }, '-created_date', 50);
      // Filter out hidden posts for non-admins
      // Hidden posts: moderators see all; authors still see their own (marked hidden)
      return user?.role === 'admin' ? allPosts : allPosts.filter(p => !p.is_hidden || p.is_own);
    },
    // Shared feed: live updates arrive over realtime; polling is the fallback
    refetchInterval: isCloudEnabled() ? (isLive ? 60000 : 15000) : false,
  });

  const createPostMutation = useMutation({
    mutationFn: async (data) => {
      const post = await client.entities.TeamPost.create(data);
      
      // Create notifications for team followers
      try {
        await client.functions.invoke('createNotifications', {
          type: 'team_post',
          teamName: data.team_name,
          title: `New post in ${data.team_name}`,
          message: `${data.user_name}: ${data.content.substring(0, 100)}${data.content.length > 100 ? '...' : ''}`,
          link: createPageUrl('TeamSocial') + `?team=${encodeURIComponent(data.team_name)}`,
          metadata: { post_id: post.id }
        });
      } catch (e) {
        console.error('Failed to create notifications:', e);
      }
      
      return post;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['team-posts', teamName]);
      setNewPost('');
      setNewsUrl('');
      setNewsTitle('');
      setVideoUrl('');
      setShowNewPost(false);
      toast.success('Posted!');
    },
  });

  const likePostMutation = useMutation({
    mutationFn: ({ postId, likes, post }) =>
      typeof client.entities.TeamPost.toggleLike === 'function'
        ? client.entities.TeamPost.toggleLike(post) // shared: one like per fan, counted by the server
        : client.entities.TeamPost.update(postId, { likes }),
    onSuccess: () => {
      queryClient.invalidateQueries(['team-posts', teamName]);
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: async ({ postId, comment }) => {
      const post = posts.find(p => p.id === postId);
      
      await Promise.all([
        client.entities.TeamComment.create(comment),
        client.entities.TeamPost.update(postId, { 
          comment_count: (post?.comment_count || 0) + 1 
        })
      ]);
      
      // Check for mentions in comment (e.g., @username)
      const mentions = comment.content.match(/@(\w+)/g);
      if (mentions && post) {
        for (const mention of mentions) {
          const username = mention.substring(1);
          try {
            await client.entities.Notification.create({
              user_email: username, // Assuming username is email or convert it
              type: 'mention',
              title: 'You were mentioned',
              message: `${comment.user_name} mentioned you in ${teamName}`,
              link: createPageUrl('TeamSocial') + `?team=${encodeURIComponent(teamName)}`,
              metadata: { post_id: postId, comment_user: comment.user_email }
            });
          } catch (e) {
            console.error('Failed to create mention notification:', e);
          }
        }
      }
    },
    onSuccess: (_data, { postId }) => {
      queryClient.invalidateQueries(['team-posts', teamName]);
      queryClient.invalidateQueries(['team-comments', postId]);
      setCommentText('');
      toast.success('Comment added!');
    },
    onError: (error) => toast.error(error.message),
  });

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast.error('Please upload a video file');
      return;
    }

    const maxMb = isCloudEnabled() ? 50 : 100; // cloud storage limit
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`Video must be under ${maxMb}MB`);
      return;
    }

    setUploadingVideo(true);
    try {
      const { file_url } = await client.integrations.Core.UploadFile({ file });
      setVideoUrl(file_url);
      setVideoFile(file);
      toast.success('Video uploaded!');
    } catch (error) {
      toast.error('Failed to upload video');
    } finally {
      setUploadingVideo(false);
    }
  };

  const handlePost = () => {
    if (!newPost.trim()) return;
    createPostMutation.mutate({
      team_name: teamName,
      user_name: user.full_name,
      user_email: user.email,
      content: newPost,
      type: postType,
      news_url: newsUrl || undefined,
      news_title: newsTitle || undefined,
      video_url: videoUrl || undefined,
    });
  };

  const handleLike = (post) => {
    const likes = post.likes || [];
    const hasLiked = likes.includes(user.email);
    const newLikes = hasLiked 
      ? likes.filter(email => email !== user.email)
      : [...likes, user.email];
    likePostMutation.mutate({ postId: post.id, likes: newLikes, post });
  };

  const handleComment = (postId) => {
    if (!commentText.trim()) return;
    createCommentMutation.mutate({
      postId,
      comment: {
        post_id: postId,
        user_name: user.full_name,
        user_email: user.email,
        content: commentText,
      }
    });
  };

  const handleFlag = async (postId) => {
    try {
      await client.entities.TeamPost.update(postId, { is_flagged: true });
      queryClient.invalidateQueries(['team-posts', teamName]);
      toast.success('Post flagged for review');
    } catch (error) {
      toast.error('Failed to flag post');
    }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await client.entities.TeamPost.delete(postId);
      queryClient.invalidateQueries(['team-posts', teamName]);
      toast.success('Post deleted');
    } catch (error) {
      toast.error(error.message || 'Failed to delete post');
    }
  };

  const handleModeration = async (postId, updateData) => {
    try {
      await client.entities.TeamPost.update(postId, updateData);
      queryClient.invalidateQueries(['team-posts', teamName]);
    } catch (error) {
      toast.error('Moderation action failed');
    }
  };


  // View-only filter for the post-type chips (does not change the query)
  const visiblePosts = typeFilter === 'all' ? posts : posts.filter(p => (p.type || 'discussion') === typeFilter);
  const typeCounts = posts.reduce((acc, p) => {
    const t = p.type || 'discussion';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  const openComposer = (type) => {
    if (type) setPostType(type);
    setShowNewPost(true);
  };

  const closeComposer = () => {
    setShowNewPost(false);
    setNewPost('');
    setNewsUrl('');
    setNewsTitle('');
  };

  const actionBtn = 'flex h-9 items-center gap-1.5 rounded-full bg-surface-container-high px-3 text-sm font-bold text-on-surface-variant transition-colors dark:bg-surface';

  return (
    <div className="space-y-4">
      {/* Feed status + moderation */}
      {(isCloudEnabled() || user?.role === 'admin') && (
        <div className="flex items-center justify-between gap-2">
          {isCloudEnabled() ? (
            <span
              className={cn(
                'gd-pill',
                isLive ? 'bg-emerald-500/15 text-emerald-700 dark:text-brand-win' : 'bg-surface-container-high text-on-surface-variant'
              )}
              title={isLive ? 'New posts appear instantly' : 'Connecting… (refreshing every 15 seconds)'}
            >
              <span className={cn('h-2 w-2 rounded-full', isLive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400')} />
              {isLive ? 'Live' : 'Connecting…'}
            </span>
          ) : <span />}
          {user?.role === 'admin' && (
            <ModerationPanel posts={posts} onModerate={handleModeration} user={user} />
          )}
        </div>
      )}

      {/* Post-type filter chips */}
      {posts.length > 0 && (
        <div className="gd-chip-row" role="toolbar" aria-label="Filter posts by type">
          <button type="button" className="gd-chip" aria-pressed={typeFilter === 'all'} onClick={() => setTypeFilter('all')}>
            <LayoutGrid className="h-3.5 w-3.5" />
            All Posts
          </button>
          {Object.entries(POST_TYPES).filter(([type]) => typeCounts[type]).map(([type, { icon: Icon, label }]) => (
            <button
              key={type}
              type="button"
              className="gd-chip"
              aria-pressed={typeFilter === type}
              onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              <span className="font-sans text-xs font-semibold opacity-70">{typeCounts[type]}</span>
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      {user && (
        <section className="gd-card p-4" aria-label="Create a post">
          {!showNewPost ? (
            <>
              <div className="flex items-start gap-3">
                <FeedAvatar src={user.picture || user.avatar_url} name={user.full_name} />
                <button
                  type="button"
                  onClick={() => openComposer()}
                  className="min-h-[52px] flex-1 rounded-xl border border-outline-variant bg-surface-container-high px-4 py-3 text-left text-[15px] text-on-surface-variant transition-colors hover:text-on-surface dark:border-white/[0.08] dark:bg-surface"
                >
                  What&apos;s the word on {teamName}? Share game vibes, takes, or cheers…
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button type="button" className={actionBtn} onClick={() => openComposer('highlight')} aria-label="Post a highlight video">
                  <Video className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-wide">Video</span>
                </button>
                <button type="button" className={actionBtn} onClick={() => openComposer('news')} aria-label="Share a news link">
                  <Newspaper className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-wide">Link</span>
                </button>
                <button
                  type="button"
                  onClick={() => openComposer()}
                  className="gd-btn-primary ml-auto flex h-10 items-center gap-1.5 rounded-xl px-5 font-display text-base font-bold uppercase tracking-wide"
                >
                  Post
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="gd-eyebrow">New post</p>
                <button
                  type="button"
                  aria-label="Close composer"
                  onClick={closeComposer}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="gd-chip-row" role="radiogroup" aria-label="Post type">
                {Object.entries(POST_TYPES).map(([type, { icon: Icon, label }]) => (
                  <button
                    key={type}
                    type="button"
                    role="radio"
                    aria-checked={postType === type}
                    aria-pressed={postType === type}
                    className="gd-chip"
                    onClick={() => setPostType(type)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex items-start gap-3">
                <FeedAvatar src={user.picture || user.avatar_url} name={user.full_name} />
                <textarea
                  autoFocus
                  placeholder={`What's on your mind about ${teamName}?`}
                  aria-label="Post text"
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  className="gd-input min-h-28 flex-1 resize-y py-3"
                />
              </div>

              {postType === 'news' && (
                <div className="space-y-2">
                  <input
                    className="gd-input"
                    placeholder="Article title"
                    aria-label="Article title"
                    value={newsTitle}
                    onChange={(e) => setNewsTitle(e.target.value)}
                  />
                  <input
                    className="gd-input"
                    type="url"
                    placeholder="Article URL"
                    aria-label="Article URL"
                    value={newsUrl}
                    onChange={(e) => setNewsUrl(e.target.value)}
                  />
                </div>
              )}

              {postType === 'highlight' && (
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-outline-variant p-4 transition-colors hover:border-brand dark:border-white/[0.12]">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    disabled={uploadingVideo}
                    className="hidden"
                  />
                  {uploadingVideo ? (
                    <div className="text-center">
                      <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
                      <p className="text-sm text-on-surface-variant">Uploading…</p>
                    </div>
                  ) : videoUrl ? (
                    <div className="text-center">
                      <Video className="mx-auto mb-2 h-8 w-8 text-emerald-600 dark:text-brand-win" />
                      <p className="text-sm font-bold text-emerald-600 dark:text-brand-win">Video ready!</p>
                      <p className="mt-1 text-xs text-on-surface-variant">Tap to change</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="mx-auto mb-2 h-8 w-8 text-on-surface-variant" />
                      <p className="text-sm font-bold text-on-surface">Upload highlight video</p>
                      <p className="text-xs text-on-surface-variant">Max {isCloudEnabled() ? 50 : 100}MB</p>
                    </div>
                  )}
                </label>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  className="h-11 flex-1 rounded-xl border border-outline-variant bg-surface-container-high font-semibold text-on-surface dark:border-white/[0.08] dark:bg-surface"
                  onClick={closeComposer}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="gd-btn-primary flex h-11 flex-1 items-center justify-center gap-2 rounded-xl font-display text-base font-bold uppercase tracking-wide disabled:opacity-60"
                  onClick={handlePost}
                  disabled={createPostMutation.isPending || !newPost.trim()}
                >
                  Post
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Trending Topics */}
      <TrendingTopics posts={posts} />

      {/* Posts Feed */}
      {visiblePosts.length === 0 ? (
        <div className="gd-card px-6 py-12 text-center">
          <Sparkles className="mx-auto mb-3 h-10 w-10 text-orange-500" />
          <p className="font-display text-xl font-bold uppercase text-on-surface">
            {posts.length ? 'No posts of this type' : 'No posts yet'}
          </p>
          <p className="mt-1 text-sm text-on-surface-variant">
            {posts.length ? 'Try another filter.' : 'Be the first to start a conversation!'}
          </p>
        </div>
      ) : (
        visiblePosts.map((post) => {
          const typeInfo = POST_TYPES[post.type];
          const PostIcon = typeInfo?.icon || MessageCircle;
          const hasLiked = post.liked_by_me ?? post.likes?.includes(user?.email);
          const likeCount = post.like_count ?? post.likes?.length ?? 0;
          const isOwnPost = post.is_own || (user && post.user_email && post.user_email === user.email);
          const commentsOpen = commentingOn === post.id;

          return (
            <article
              key={post.id}
              className={cn('gd-card overflow-hidden p-4', post.is_hidden && 'border-amber-400/60 dark:border-amber-400/40')}
            >
              {/* Post Header */}
              <div className="mb-3 flex items-start gap-3">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default"
                  disabled={!post.user_email}
                  onClick={() => post.user_email && navigate(createPageUrl('UserProfile') + `?email=${post.user_email}`)}
                  aria-label={`${post.user_name || 'Fan'}'s profile`}
                >
                  <FeedAvatar src={post.user_avatar} name={post.user_name} />
                  <span className="min-w-0">
                    <span className="block truncate font-display text-lg font-bold uppercase leading-tight text-on-surface">
                      {post.user_name || 'Fan'}
                    </span>
                    <span className="block truncate text-xs font-medium text-on-surface-variant">
                      {timeAgo(post.created_date)}
                    </span>
                  </span>
                </button>
                <span className={cn('gd-pill shrink-0', typeInfo?.pill || 'bg-surface-container-high text-on-surface-variant')}>
                  <PostIcon className="h-3 w-3" />
                  {typeInfo?.label || post.type}
                </span>
              </div>

              {post.is_hidden && (
                <p className="mb-3 flex items-start gap-1.5 rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700 dark:text-brand-highlight">
                  <Flag className="mt-0.5 h-3 w-3 shrink-0" />
                  {isOwnPost ? 'Hidden from other fans after reports. A moderator can restore it.' : 'Hidden from fans (moderator view)'}
                </p>
              )}

              {/* Post Content */}
              <p className="mb-3 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-on-surface">{post.content}</p>

              {/* News Link */}
              {post.news_url && (
                <a
                  href={post.news_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-3 flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-high p-3 transition-colors hover:border-brand/60 dark:border-white/[0.08] dark:bg-surface"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-700 dark:text-violet-300">
                    <Newspaper className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-on-surface">{post.news_title || 'Article'}</span>
                    <span className="flex items-center gap-1 text-xs font-semibold text-orange-600 dark:text-brand-soft">
                      Read article <ExternalLink className="h-3 w-3" />
                    </span>
                  </span>
                </a>
              )}

              {/* Video Highlight */}
              {post.video_url && (
                <div className="relative mb-3 overflow-hidden rounded-xl bg-ink-900">
                  <video
                    src={post.video_url}
                    controls
                    className="max-h-96 w-full object-contain"
                    preload="metadata"
                  >
                    Your browser does not support the video tag.
                  </video>
                  <span className="gd-pill pointer-events-none absolute left-2 top-2 bg-black/60 text-white backdrop-blur">
                    <Play className="h-3 w-3 fill-current" />
                    Highlight
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 border-t border-outline-variant/60 pt-3 dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => user && handleLike(post)}
                  className={cn(actionBtn, hasLiked && 'bg-red-500/10 text-red-600')}
                  disabled={!user}
                  aria-pressed={!!hasLiked}
                  aria-label={`${hasLiked ? 'Unlike' : 'Like'} post (${likeCount} likes)`}
                >
                  <Heart className={cn('h-4 w-4', hasLiked && 'fill-current')} />
                  <span className="tabular-nums">{likeCount}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCommentingOn(commentsOpen ? null : post.id)}
                  className={cn(actionBtn, commentsOpen && 'text-orange-600 dark:text-brand-soft')}
                  aria-expanded={commentsOpen}
                  aria-label={`Comments (${post.comment_count || 0})`}
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="tabular-nums">{post.comment_count || 0}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.share?.({
                      title: `${post.user_name} on ${teamName}`,
                      text: post.content,
                    }).catch(() => {
                      navigator.clipboard.writeText(post.content);
                      toast.success('Copied to clipboard!');
                    });
                  }}
                  className={actionBtn}
                  aria-label="Share post"
                >
                  <Share2 className="h-4 w-4" />
                </button>
                {isOwnPost && (
                  <button
                    type="button"
                    onClick={() => handleDelete(post.id)}
                    className="ml-auto flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:text-red-500"
                    aria-label="Delete post"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                {user && !isOwnPost && !post.is_flagged && (
                  <button
                    type="button"
                    onClick={() => handleFlag(post.id)}
                    className="ml-auto flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:text-amber-500"
                    title="Flag for moderation"
                    aria-label="Report post"
                  >
                    <Flag className="h-4 w-4" />
                  </button>
                )}
                {post.is_flagged && (
                  <span className={cn('gd-pill bg-amber-500/15 text-amber-700 dark:text-brand-highlight', !isOwnPost && 'ml-auto')}>
                    <Flag className="h-3 w-3" />
                    Flagged
                  </span>
                )}
              </div>

              {/* Comments */}
              {commentsOpen && (
                <div className="mt-3 border-t border-outline-variant/60 pt-3 dark:border-white/[0.06]">
                  <CommentList
                    postId={post.id}
                    user={user}
                    onDeleted={() => {
                      queryClient.invalidateQueries(['team-comments', post.id]);
                      queryClient.invalidateQueries(['team-posts', teamName]);
                    }}
                  />
                  {user && (
                    <div className="flex items-center gap-2">
                      <input
                        className="gd-input h-11 flex-1 rounded-full"
                        placeholder="Write a comment…"
                        aria-label="Write a comment"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleComment(post.id)}
                      />
                      <button
                        type="button"
                        aria-label="Send comment"
                        className="gd-btn-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-full disabled:opacity-60"
                        onClick={() => handleComment(post.id)}
                        disabled={createCommentMutation.isPending}
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })
      )}
    </div>
  );
}
