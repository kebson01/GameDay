import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, MessageCircle, Share2, Send, Trophy, 
  Newspaper, TrendingUp, Sparkles, ExternalLink, Video, Upload, Flag, Play, Trash2 
} from 'lucide-react';
import { isCloudEnabled } from '@/lib/supabase';
import { subscribeToTeamPosts } from '@/lib/cloudEntities';

// Comments under a post (loaded when the post's comment area is opened)
function CommentList({ postId, user, onDeleted }) {
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['team-comments', postId],
    queryFn: () => client.entities.TeamComment.filter({ post_id: postId }, 'created_date', 100),
    refetchInterval: 15000,
  });
  if (isLoading) return <p className="text-xs text-slate-400 py-2">Loading comments…</p>;
  if (!comments.length) return <p className="text-xs text-slate-500 py-2">No comments yet. Start the conversation!</p>;
  return (
    <ul className="space-y-2 mb-3">
      {comments.map((c) => {
        const mine = c.is_own || (user && c.user_email && c.user_email === user.email);
        return (
          <li key={c.id} className="flex items-start gap-2">
            {c.user_avatar ? (
              <img src={c.user_avatar} alt="" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                {c.user_name?.charAt(0) || 'U'}
              </div>
            )}
            <div className="flex-1 min-w-0 rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-xs">
                <span className="font-semibold text-slate-900">{c.user_name || 'Fan'}</span>
                <span className="text-slate-400"> · {formatDistanceToNow(new Date(c.created_date), { addSuffix: true })}</span>
              </p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">{c.content}</p>
            </div>
            {mine && (
              <button
                aria-label="Delete comment"
                className="p-1 text-slate-400 hover:text-red-500"
                onClick={async () => {
                  try {
                    await client.entities.TeamComment.delete(c.id);
                    onDeleted?.();
                  } catch (e) {
                    toast.error(e.message);
                  }
                }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import TrendingTopics from './TrendingTopics.jsx';
import ModerationPanel from './ModerationPanel.jsx';

const POST_TYPES = {
  discussion: { icon: MessageCircle, color: 'bg-blue-500', label: 'Discussion' },
  news: { icon: Newspaper, color: 'bg-purple-500', label: 'News' },
  prediction: { icon: TrendingUp, color: 'bg-orange-500', label: 'Prediction' },
  celebration: { icon: Trophy, color: 'bg-green-500', label: 'Celebration' },
  highlight: { icon: Video, color: 'bg-red-500', label: 'Highlight' },
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

  return (
    <div className="space-y-4">
      {/* Moderation Panel */}
      {user?.role === 'admin' && (
        <div className="flex justify-end">
          <ModerationPanel posts={posts} onModerate={handleModeration} user={user} />
        </div>
      )}

      {isCloudEnabled() && (
        <div className="flex justify-end -mb-2">
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold ${isLive ? 'text-green-600' : 'text-slate-400'}`}
            title={isLive ? 'New posts appear instantly' : 'Connecting… (refreshing every 15 seconds)'}
          >
            <span className={`h-2 w-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
            {isLive ? 'Live' : 'Connecting…'}
          </span>
        </div>
      )}

      {/* Trending Topics */}
      <TrendingTopics posts={posts} />

      {/* Create Post */}
      {user && (
        <div className="bg-surface-container rounded-2xl p-4 shadow-sm">
          {!showNewPost ? (
            <button
              onClick={() => setShowNewPost(true)}
              className="w-full text-left px-4 py-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors text-slate-500"
            >
              Share your thoughts about {teamName}...
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {Object.entries(POST_TYPES).map(([type, { icon: Icon, color, label }]) => (
                  <Badge
                    key={type}
                    variant={postType === type ? "default" : "outline"}
                    className={`cursor-pointer shrink-0 ${postType === type ? color + ' text-white' : ''}`}
                    onClick={() => setPostType(type)}
                  >
                    <Icon className="w-3 h-3 mr-1" />
                    {label}
                  </Badge>
                ))}
              </div>

              <Textarea
                placeholder={`What's on your mind about ${teamName}?`}
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                className="min-h-24"
              />

              {postType === 'news' && (
                <>
                  <Input
                    placeholder="Article title"
                    value={newsTitle}
                    onChange={(e) => setNewsTitle(e.target.value)}
                  />
                  <Input
                    placeholder="Article URL"
                    value={newsUrl}
                    onChange={(e) => setNewsUrl(e.target.value)}
                  />
                </>
              )}

              {postType === 'highlight' && (
                <div>
                  <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-slate-300 rounded-xl hover:border-orange-500 transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleVideoUpload}
                      disabled={uploadingVideo}
                      className="hidden"
                    />
                    {uploadingVideo ? (
                      <div className="text-center">
                        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-2" />
                        <p className="text-sm text-slate-600">Uploading...</p>
                      </div>
                    ) : videoUrl ? (
                      <div className="text-center">
                        <Video className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-green-600">Video Ready!</p>
                        <p className="text-xs text-slate-500 mt-1">Click to change</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-slate-600">Upload Highlight Video</p>
                        <p className="text-xs text-slate-500">Max 100MB</p>
                      </div>
                    )}
                  </label>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setShowNewPost(false);
                    setNewPost('');
                    setNewsUrl('');
                    setNewsTitle('');
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                  onClick={handlePost}
                  disabled={createPostMutation.isPending}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Post
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Posts Feed */}
      {posts.length === 0 ? (
        <div className="text-center py-12 bg-surface-container rounded-2xl">
          <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-2">No posts yet</p>
          <p className="text-sm text-slate-400">Be the first to start a conversation!</p>
        </div>
      ) : (
        posts.map((post) => {
          const PostIcon = POST_TYPES[post.type]?.icon || MessageCircle;
          const hasLiked = post.liked_by_me ?? post.likes?.includes(user?.email);
          const likeCount = post.like_count ?? post.likes?.length ?? 0;
          const isOwnPost = post.is_own || (user && post.user_email && post.user_email === user.email);
          
          return (
            <div key={post.id} className="bg-surface-container rounded-2xl p-4 shadow-sm">
              {/* Post Header */}
              <div className="flex items-start justify-between mb-3">
                <div 
                  className={`flex items-center gap-3 ${post.user_email ? 'cursor-pointer' : ''}`}
                  onClick={() => post.user_email && navigate(createPageUrl('UserProfile') + `?email=${post.user_email}`)}
                >
                  {post.user_avatar ? (
                    <img src={post.user_avatar} alt="" referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-600 flex items-center justify-center text-white font-bold">
                      {post.user_name?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-slate-900 hover:text-orange-600 transition-colors">{post.user_name}</p>
                    <p className="text-xs text-slate-500">
                      {formatDistanceToNow(new Date(post.created_date), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <Badge className={`${POST_TYPES[post.type]?.color || 'bg-slate-500'} text-white`}>
                  <PostIcon className="w-3 h-3 mr-1" />
                  {POST_TYPES[post.type]?.label || post.type}
                </Badge>
              </div>

              {post.is_hidden && (
                <p className="mb-2 rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2 text-xs text-yellow-800">
                  <Flag className="inline w-3 h-3 mr-1" />
                  {isOwnPost ? 'Hidden from other fans after reports. A moderator can restore it.' : 'Hidden from fans (moderator view)'}
                </p>
              )}

              {/* Post Content */}
              <p className="text-slate-700 mb-3 whitespace-pre-wrap">{post.content}</p>

              {/* News Link */}
              {post.news_url && (
                <a
                  href={post.news_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mb-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Newspaper className="w-4 h-4 text-slate-500" />
                    <p className="text-sm font-semibold text-slate-900">{post.news_title || 'Article'}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-blue-600">
                    <span>Read article</span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </a>
              )}

              {/* Video Highlight */}
              {post.video_url && (
                <div className="mb-3 relative group rounded-xl overflow-hidden bg-ink-900">
                  <video 
                    src={post.video_url}
                    controls
                    className="w-full max-h-96 object-contain"
                    preload="metadata"
                  >
                    Your browser does not support the video tag.
                  </video>
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-red-500 text-white">
                      <Play className="w-3 h-3 mr-1" />
                      Highlight
                    </Badge>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-4 pt-3 border-t border-slate-100">
                <button
                  onClick={() => user && handleLike(post)}
                  className="flex items-center gap-2 text-slate-600 hover:text-red-500 transition-colors"
                  disabled={!user}
                >
                  <Heart className={`w-5 h-5 ${hasLiked ? 'fill-red-500 text-red-500' : ''}`} />
                  <span className="text-sm font-medium">{likeCount}</span>
                </button>
                <button
                  onClick={() => setCommentingOn(commentingOn === post.id ? null : post.id)}
                  className="flex items-center gap-2 text-slate-600 hover:text-blue-500 transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">{post.comment_count || 0}</span>
                </button>
                <button
                  onClick={() => {
                    navigator.share?.({ 
                      title: `${post.user_name} on ${teamName}`,
                      text: post.content,
                    }).catch(() => {
                      navigator.clipboard.writeText(post.content);
                      toast.success('Copied to clipboard!');
                    });
                  }}
                  className="flex items-center gap-2 text-slate-600 hover:text-green-500 transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                </button>
                {isOwnPost && (
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="flex items-center gap-2 text-slate-400 hover:text-red-500 transition-colors ml-auto"
                    aria-label="Delete post"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                {user && !isOwnPost && !post.is_flagged && (
                  <button
                    onClick={() => handleFlag(post.id)}
                    className="flex items-center gap-2 text-slate-600 hover:text-yellow-500 transition-colors ml-auto"
                    title="Flag for moderation"
                  >
                    <Flag className="w-5 h-5" />
                  </button>
                )}
                {post.is_flagged && (
                  <Badge variant="outline" className="text-yellow-600 border-yellow-600 ml-auto">
                    <Flag className="w-3 h-3 mr-1" />
                    Flagged
                  </Badge>
                )}
              </div>

              {/* Comments */}
              {commentingOn === post.id && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <CommentList
                    postId={post.id}
                    user={user}
                    onDeleted={() => {
                      queryClient.invalidateQueries(['team-comments', post.id]);
                      queryClient.invalidateQueries(['team-posts', teamName]);
                    }}
                  />
                  {user && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Write a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleComment(post.id)}
                    />
                    <Button
                      size="icon"
                      onClick={() => handleComment(post.id)}
                      disabled={createCommentMutation.isPending}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}