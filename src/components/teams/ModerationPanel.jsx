import React, { useState } from 'react';
import { Shield, Eye, EyeOff, Flag, Trash2, AlertTriangle, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function ModerationPanel({ posts, onModerate, user }) {
  const [showPanel, setShowPanel] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [moderationReason, setModerationReason] = useState('');

  const isAdmin = user?.role === 'admin';

  if (!isAdmin) return null;

  const flaggedPosts = posts.filter(p => p.is_flagged && !p.is_hidden);
  const hiddenPosts = posts.filter(p => p.is_hidden);

  const handleModeration = async (post, action) => {
    let updateData = {};
    
    if (action === 'hide') {
      updateData = { 
        is_hidden: true, 
        moderation_reason: moderationReason || 'Content removed by moderator' 
      };
    } else if (action === 'unhide') {
      updateData = { 
        is_hidden: false, 
        is_flagged: false,
        moderation_reason: null 
      };
    } else if (action === 'unflag') {
      updateData = { is_flagged: false };
    }

    await onModerate(post.id, updateData);
    setSelectedPost(null);
    setModerationReason('');
    toast.success('Moderation action completed');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowPanel(true)}
        className="gd-chip"
        aria-label={`Moderation${flaggedPosts.length ? ` (${flaggedPosts.length} flagged)` : ''}`}
      >
        <Shield className="h-3.5 w-3.5 text-orange-600 dark:text-brand-soft" />
        Moderation
        {flaggedPosts.length > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 font-sans text-[11px] font-bold text-white">
            {flaggedPosts.length}
          </span>
        )}
      </button>

      <Dialog open={showPanel} onOpenChange={setShowPanel}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto rounded-2xl border-outline-variant bg-surface-container dark:border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-xl font-bold uppercase tracking-wide text-on-surface">
              <Shield className="w-5 h-5 text-orange-600 dark:text-brand-soft" />
              Content Moderation
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Flagged Posts */}
            {flaggedPosts.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Flag className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <h3 className="font-semibold text-on-surface">Flagged Content ({flaggedPosts.length})</h3>
                </div>
                <div className="space-y-3">
                  {flaggedPosts.map(post => (
                    <div key={post.id} className="rounded-xl border border-red-500/30 bg-red-500/[0.06] p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-on-surface">{post.user_name}</p>
                          <p className="text-xs text-on-surface-variant">
                            {formatDistanceToNow(new Date(post.created_date), { addSuffix: true })}
                          </p>
                        </div>
                        <span className="gd-pill bg-surface-container-high text-on-surface-variant">{post.type}</span>
                      </div>
                      <p className="text-sm text-on-surface mb-3 line-clamp-3">{post.content}</p>
                      {post.video_url && (
                        <Badge className="mb-3 bg-violet-600 text-white hover:bg-violet-600">
                          <MessageCircle className="w-3 h-3 mr-1" />
                          Contains Video
                        </Badge>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setSelectedPost(post)}
                        >
                          <EyeOff className="w-3 h-3 mr-1" />
                          Hide
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleModeration(post, 'unflag')}
                        >
                          Clear Flag
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hidden Posts */}
            {hiddenPosts.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <EyeOff className="w-4 h-4 text-on-surface-variant" />
                  <h3 className="font-semibold text-on-surface">Hidden Content ({hiddenPosts.length})</h3>
                </div>
                <div className="space-y-3">
                  {hiddenPosts.map(post => (
                    <div key={post.id} className="rounded-xl border border-outline-variant bg-surface-container-high p-4 dark:border-white/[0.08] dark:bg-surface">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-on-surface">{post.user_name}</p>
                          <p className="text-xs text-on-surface-variant">
                            {formatDistanceToNow(new Date(post.created_date), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-on-surface mb-2 line-clamp-2">{post.content}</p>
                      {post.moderation_reason && (
                        <p className="text-xs text-on-surface-variant mb-3">
                          <AlertTriangle className="w-3 h-3 inline mr-1" />
                          {post.moderation_reason}
                        </p>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleModeration(post, 'unhide')}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Restore
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {flaggedPosts.length === 0 && hiddenPosts.length === 0 && (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-on-surface-variant/50 mx-auto mb-3" />
                <p className="text-on-surface-variant">No content requires moderation</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Hide Post Dialog */}
      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="rounded-2xl border-outline-variant bg-surface-container dark:border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold uppercase tracking-wide text-on-surface">Hide Post</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-on-surface-variant">
              This will hide the post from the feed. Please provide a reason:
            </p>
            <Textarea
              placeholder="Reason for hiding this post..."
              value={moderationReason}
              onChange={(e) => setModerationReason(e.target.value)}
              className="gd-input min-h-24 py-3"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setSelectedPost(null);
                  setModerationReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => selectedPost && handleModeration(selectedPost, 'hide')}
              >
                Hide Post
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}