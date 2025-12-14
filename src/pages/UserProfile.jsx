import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/lib/auth';
import { client } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Star, TrendingUp, Target, Award, MessageCircle, ThumbsUp, Settings, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AuthModal from '@/components/auth/AuthModal';

export default function UserProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const urlParams = new URLSearchParams(window.location.search);
  const profileEmail = urlParams.get('email');

  useEffect(() => {
    auth.me()
      .then(setUser)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isOwnProfile = !profileEmail || user?.email === profileEmail;
  const displayEmail = isOwnProfile ? user?.email : profileEmail;

  // Fetch user's followed teams
  const favoriteTeams = user?.favorite_teams || [];

  // Fetch user's predictions
  const { data: predictions = [] } = useQuery({
    queryKey: ['predictions', displayEmail],
    queryFn: () => displayEmail ? client.entities.Prediction.filter({ user_email: displayEmail }, '-created_date', 100) : [],
    enabled: !!displayEmail,
  });

  // Fetch user's posts
  const { data: posts = [] } = useQuery({
    queryKey: ['user-posts', displayEmail],
    queryFn: () => displayEmail ? client.entities.TeamPost.filter({ user_email: displayEmail }, '-created_date', 50) : [],
    enabled: !!displayEmail,
  });

  // Calculate prediction stats
  const predictionStats = {
    total: predictions.length,
    correct: predictions.filter(p => p.was_correct).length,
    pending: predictions.filter(p => p.was_correct === undefined || p.was_correct === null).length,
  };

  const accuracy = predictionStats.total > 0 
    ? Math.round((predictionStats.correct / (predictionStats.total - predictionStats.pending)) * 100) 
    : 0;

  // Group predictions by confidence
  const predictionsByConfidence = {
    high: predictions.filter(p => p.confidence === 'high'),
    medium: predictions.filter(p => p.confidence === 'medium'),
    low: predictions.filter(p => p.confidence === 'low'),
  };

  const handleAuthSuccess = (loggedInUser) => {
    setUser(loggedInUser);
  };

  if (loading) {
    return (
      <div className="gd-page flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="gd-page flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-lg p-8 text-center max-w-sm w-full">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <LogIn className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Sign In Required</h1>
          <p className="text-slate-600 mb-6">Sign in to view your profile and track your predictions.</p>
          <Button 
            onClick={() => setShowAuthModal(true)}
            className="w-full h-12 gd-btn-primary"
          >
            Sign In
          </Button>
          <Button 
            variant="ghost"
            onClick={() => navigate(createPageUrl('Home'))}
            className="w-full mt-2"
          >
            Go Back
          </Button>
        </div>
        
        <AuthModal 
          open={showAuthModal} 
          onOpenChange={setShowAuthModal}
          onSuccess={handleAuthSuccess}
          feature="your profile"
        />
      </div>
    );
  }

  return (
    <div className="gd-page">
      {/* Header */}
      <div className="gd-header px-4 pt-12 pb-8">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          {isOwnProfile && (
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => navigate(createPageUrl('Settings'))}
            >
              <Settings className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Profile Info */}
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-4xl">
            {user.full_name?.charAt(0) || '👤'}
          </div>
          <h1 className="text-2xl font-bold mb-1">{isOwnProfile ? user.full_name : displayEmail}</h1>
          <p className="text-white/80 text-sm mb-4">{user.email}</p>

          {/* Stats Row */}
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{favoriteTeams.length}</p>
              <p className="text-white/80 text-xs">Teams</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{posts.length}</p>
              <p className="text-white/80 text-xs">Posts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{predictionStats.total}</p>
              <p className="text-white/80 text-xs">Predictions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        <Tabs defaultValue="teams" className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="teams">
              <Star className="w-4 h-4 mr-1" />
              Teams
            </TabsTrigger>
            <TabsTrigger value="predictions">
              <Target className="w-4 h-4 mr-1" />
              Predictions
            </TabsTrigger>
            <TabsTrigger value="activity">
              <MessageCircle className="w-4 h-4 mr-1" />
              Activity
            </TabsTrigger>
          </TabsList>

          {/* Followed Teams */}
          <TabsContent value="teams">
            <div className="space-y-3">
              {favoriteTeams.length > 0 ? (
                favoriteTeams.map((team, idx) => (
                  <div key={idx} className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Star className="w-5 h-5 text-orange-500 fill-orange-500" />
                        <span className="font-semibold text-slate-900">{team}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(createPageUrl('TeamPage') + `?team=${encodeURIComponent(team)}`)}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-white rounded-2xl">
                  <Star className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No teams followed yet</p>
                  <Button 
                    variant="link" 
                    className="text-orange-500"
                    onClick={() => navigate(createPageUrl('DiscoverTeams'))}
                  >
                    Discover Teams
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Predictions */}
          <TabsContent value="predictions">
            <div className="space-y-4">
              {/* Prediction Stats */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="w-5 h-5 text-orange-500" />
                  <h3 className="font-bold text-slate-900">Prediction Stats</h3>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">{predictionStats.correct}</p>
                    <p className="text-xs text-slate-600">Correct</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-orange-600">{predictionStats.pending}</p>
                    <p className="text-xs text-slate-600">Pending</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-slate-900">{accuracy || 0}%</p>
                    <p className="text-xs text-slate-600">Accuracy</p>
                  </div>
                </div>
              </div>

              {predictions.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl">
                  <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No predictions yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Activity Feed */}
          <TabsContent value="activity">
            <div className="space-y-3">
              {posts.length > 0 ? (
                posts.map((post) => (
                  <div 
                    key={post.id} 
                    className="bg-white rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(createPageUrl('TeamPage') + `?team=${encodeURIComponent(post.team_name)}`)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="capitalize">{post.type}</Badge>
                      <span className="text-xs text-slate-500">
                        {new Date(post.created_date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 mb-1">{post.team_name}</p>
                    <p className="text-sm text-slate-700 mb-3 line-clamp-2">{post.content}</p>
                    <div className="flex items-center gap-4 text-slate-500 text-xs">
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" />
                        {post.likes?.length || 0}
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        {post.comment_count || 0}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-white rounded-2xl">
                  <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No activity yet</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
