import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/lib/auth';
import { client } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Star, Target, Award, MessageCircle, ThumbsUp, Settings, UserRound, ChevronRight, Compass } from 'lucide-react';
import AppHeader from '@/components/layout/AppHeader';
import AuthModal from '@/components/auth/AuthModal';
import { Skeleton } from '@/components/common/LoadingSkeleton';
import { SignInCard, EmptyCard } from '@/components/crew-v2/ui';

const TABS = [
  { id: 'teams', label: 'Teams', icon: Star },
  { id: 'predictions', label: 'Picks', icon: Target },
  { id: 'activity', label: 'Activity', icon: MessageCircle },
];

export default function UserProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [tab, setTab] = useState('teams');

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
  const favoriteTeams = isOwnProfile ? user?.favorite_teams || [] : [];

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
  const decided = predictionStats.total - predictionStats.pending;
  const accuracy = decided > 0 ? Math.round((predictionStats.correct / decided) * 100) : 0;

  const header = (
    <AppHeader
      eyebrow="Fan Profile"
      title={loading ? 'Profile' : user ? (isOwnProfile ? 'My Profile' : 'Fan Profile') : 'Profile'}
      back
      showProfile={false}
      actions={user && isOwnProfile && (
        <button
          type="button"
          aria-label="Settings"
          onClick={() => navigate(createPageUrl('Settings'))}
          className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface"
        >
          <Settings className="h-5 w-5" />
        </button>
      )}
    />
  );

  if (loading) {
    return (
      <div className="gd-page">
        {header}
        <main className="space-y-4 px-4 pt-4">
          <Skeleton className="h-56 w-full rounded-2xl" />
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="gd-page">
        {header}
        <main className="space-y-4 px-4 pt-4">
          <SignInCard
            icon={UserRound}
            text="Sign in to view your profile, followed teams and game picks."
            onSignIn={() => setShowAuthModal(true)}
          >
            <button
              type="button"
              onClick={() => navigate(createPageUrl('Home'))}
              className="mt-2 h-11 w-full rounded-xl text-sm font-semibold text-on-surface-variant hover:text-on-surface"
            >
              Go back
            </button>
          </SignInCard>
        </main>
        <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} onSuccess={setUser} feature="your profile" />
      </div>
    );
  }

  const name = isOwnProfile ? user.full_name || user.email?.split('@')[0] : displayEmail?.split('@')[0];
  const stats = [
    { label: 'Teams', value: favoriteTeams.length, hidden: !isOwnProfile },
    { label: 'Posts', value: posts.length },
    { label: 'Picks', value: predictionStats.total },
  ].filter(s => !s.hidden);

  return (
    <div className="gd-page">
      {header}

      <main className="space-y-4 px-4 pt-4">
        {/* Identity */}
        <section className="gd-card gd-card-glow relative overflow-hidden p-5 text-center">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-brand/20 to-transparent" />
          <div className="relative mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-brand font-display text-4xl font-bold text-white ring-4 ring-brand/30">
            {isOwnProfile && user.picture ? (
              <img src={user.picture} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
            ) : (
              (name?.charAt(0) || '?').toUpperCase()
            )}
          </div>
          <h2 className="relative mt-3 break-words font-display text-3xl font-bold uppercase leading-tight text-on-surface">{name}</h2>
          <p className="relative truncate text-sm text-on-surface-variant">{displayEmail}</p>

          <div className={`relative mt-4 grid gap-2 ${stats.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {stats.map(s => (
              <div key={s.label} className="rounded-xl bg-surface-container-high py-2.5 dark:bg-surface">
                <p className="gd-score text-3xl leading-none text-on-surface">{s.value}</p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tabs */}
        <div className="gd-segment grid-cols-3" role="tablist" aria-label="Profile sections">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>

        {/* Followed Teams */}
        {tab === 'teams' && (
          <div className="space-y-2" role="tabpanel">
            {favoriteTeams.length > 0 ? (
              favoriteTeams.map((team) => (
                <button
                  key={team}
                  type="button"
                  onClick={() => navigate(createPageUrl('TeamPage') + `?team=${encodeURIComponent(team)}`)}
                  className="gd-card flex w-full items-center gap-3 p-3 text-left"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-orange-600 dark:text-brand-soft">
                    <Star className="h-5 w-5 fill-current" />
                  </span>
                  <span className="min-w-0 flex-1 truncate font-display text-lg font-bold uppercase text-on-surface">{team}</span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-on-surface-variant" />
                </button>
              ))
            ) : (
              <EmptyCard icon={Star} title="No teams yet" text={isOwnProfile ? 'Follow teams to get their scores and news first.' : 'This fan’s teams are private.'}>
                {isOwnProfile && (
                  <button
                    type="button"
                    onClick={() => navigate(createPageUrl('DiscoverTeams'))}
                    className="gd-btn-primary mt-4 inline-flex h-11 items-center gap-1.5 rounded-xl px-4 text-sm font-bold"
                  >
                    <Compass className="h-4 w-4" />Discover teams
                  </button>
                )}
              </EmptyCard>
            )}
          </div>
        )}

        {/* Predictions */}
        {tab === 'predictions' && (
          <div className="space-y-3" role="tabpanel">
            <section className="gd-card p-4">
              <h3 className="flex items-center gap-2 font-display text-lg font-bold uppercase text-on-surface">
                <Award className="h-5 w-5 text-amber-600 dark:text-brand-highlight" />Pick record
              </h3>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-surface-container-high py-2.5 dark:bg-surface">
                  <p className="gd-score text-3xl leading-none text-emerald-600 dark:text-brand-win">{predictionStats.correct}</p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Correct</p>
                </div>
                <div className="rounded-xl bg-surface-container-high py-2.5 dark:bg-surface">
                  <p className="gd-score text-3xl leading-none text-orange-600 dark:text-brand-soft">{predictionStats.pending}</p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Pending</p>
                </div>
                <div className="rounded-xl bg-surface-container-high py-2.5 dark:bg-surface">
                  <p className="gd-score text-3xl leading-none text-on-surface">{accuracy}%</p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Accuracy</p>
                </div>
              </div>
            </section>
            {predictions.length === 0 && <EmptyCard icon={Target} title="No picks yet" text="Make a prediction on a game to start your record." />}
          </div>
        )}

        {/* Activity Feed */}
        {tab === 'activity' && (
          <div className="space-y-3" role="tabpanel">
            {posts.length > 0 ? (
              posts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  className="gd-card block w-full p-4 text-left"
                  onClick={() => navigate(createPageUrl('TeamPage') + `?team=${encodeURIComponent(post.team_name)}`)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="gd-pill bg-brand/15 text-orange-700 dark:text-brand-soft">{post.type}</span>
                    <span className="text-xs text-on-surface-variant">{new Date(post.created_date).toLocaleDateString()}</span>
                  </div>
                  <p className="mt-2 font-display text-base font-bold uppercase text-on-surface">{post.team_name}</p>
                  <p className="line-clamp-2 text-sm text-on-surface-variant">{post.content}</p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-on-surface-variant">
                    <span className="flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" />{post.likes?.length ?? post.like_count ?? 0}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" />{post.comment_count || 0}</span>
                  </div>
                </button>
              ))
            ) : (
              <EmptyCard icon={MessageCircle} title="No activity yet" text="Posts in team chats will show up here." />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
