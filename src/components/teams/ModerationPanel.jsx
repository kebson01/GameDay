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
      <Button
        onClick={() => setShowPanel(true)}
        variant="outline"
        className="gap-2 border-orange-200 hover:bg-orange-50"
      >
        <Shield className="w-4 h-4 text-orange-600" />
        <span className="font-semibold">Moderation</span>
        {flaggedPosts.length > 0 && (
          <Badge className="bg-red-500 text-white">
            {flaggedPosts.length}
          </Badge>
        )}
      </Button>

      <Dialog open={showPanel} onOpenChange={setShowPanel}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-600" />
              Content Moderation
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Flagged Posts */}
            {flaggedPosts.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Flag className="w-4 h-4 text-red-600" />
                  <h3 className="font-semibold text-slate-900">Flagged Content ({flaggedPosts.length})</h3>
                </div>
                <div className="space-y-3">
                  {flaggedPosts.map(post => (
                    <div key={post.id} className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-slate-900">{post.user_name}</p>
                          <p className="text-xs text-slate-500">
                            {formatDistanceToNow(new Date(post.created_date), { addSuffix: true })}
                          </p>
                        </div>
                        <Badge variant="outline" className="capitalize">{post.type}</Badge>
                      </div>
                      <p className="text-sm text-slate-700 mb-3 line-clamp-3">{post.content}</p>
                      {post.video_url && (
                        <Badge className="bg-purple-500 mb-3">
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
                  <EyeOff className="w-4 h-4 text-slate-600" />
                  <h3 className="font-semibold text-slate-900">Hidden Content ({hiddenPosts.length})</h3>
                </div>
                <div className="space-y-3">
                  {hiddenPosts.map(post => (
                    <div key={post.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-slate-900">{post.user_name}</p>
                          <p className="text-xs text-slate-500">
                            {formatDistanceToNow(new Date(post.created_date), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 mb-2 line-clamp-2">{post.content}</p>
                      {post.moderation_reason && (
                        <p className="text-xs text-slate-500 mb-3">
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
                <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No content requires moderation</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Hide Post Dialog */}
      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hide Post</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-slate-600">
              This will hide the post from the feed. Please provide a reason:
            </p>
            <Textarea
              placeholder="Reason for hiding this post..."
              value={moderationReason}
              onChange={(e) => setModerationReason(e.target.value)}
              className="min-h-24"
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