import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { HomeIcon, LiveIcon, TailgateIcon, TeamsIcon, FriendsIcon } from '@/components/icons/GameDayIcons';
import { cn } from '@/lib/utils';
import { Toaster } from 'sonner';
import { auth } from '@/lib/auth';
import OfflineIndicator from '@/components/common/OfflineIndicator';
import AuthModal from '@/components/auth/AuthModal';
import { useTheme } from '@/lib/theme';

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    auth.me().then(setUser).catch(() => setUser(null));
  }, [location.pathname]);

  // auth.redirectToLogin() dispatches this event. Home renders its own modal,
  // so handle it here for every other page (previously nothing happened there).
  useEffect(() => {
    if (currentPageName === 'Home') return undefined;
    const handleShowLogin = () => setShowAuthModal(true);
    window.addEventListener('gameday:showLogin', handleShowLogin);
    return () => window.removeEventListener('gameday:showLogin', handleShowLogin);
  }, [currentPageName]);
  
  const navItems = [
    { name: 'Home', icon: HomeIcon, page: 'Home', also: [] },
    { name: 'Live', icon: LiveIcon, page: 'GameDay', also: ['LiveGame', 'Schedule', 'Standings'] },
    { name: 'Tailgates', icon: TailgateIcon, page: 'TailgateDirectory', also: ['TailgateDetail', 'CreateTailgate'] },
    { name: 'Teams', icon: TeamsIcon, page: 'MyTeams', also: ['TeamPage', 'DiscoverTeams', 'TeamSocial'] },
    { name: 'Friends', icon: FriendsIcon, page: 'FindFriends', also: ['CarLocator', 'CampusMap'] },
  ];

  const showNav = !['Settings', 'PrivacyPolicy', 'TermsOfService'].includes(currentPageName);
  
  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <style>{`
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          display: none;
        }
        
        /* Smooth animations */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
        
        /* Safe area for notch devices */
        .safe-area-pb {
          padding-bottom: env(safe-area-inset-bottom, 0);
        }
      `}</style>
      
      {/* Offline Indicator */}
      <OfflineIndicator />

      <main className="pb-20">
        {children}
      </main>
      
      {/* Bottom Navigation */}
      {showNav && (
        <nav
          aria-label="Main"
          className="fixed bottom-0 left-0 right-0 z-50 safe-area-pb bg-surface-container/95 backdrop-blur-xl border-t border-outline-variant shadow-[0_-4px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.35)]"
        >
          <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
            {navItems.map(({ name, icon: Icon, page, also }) => {
              const isActive = currentPageName === page || also.includes(currentPageName);
              return (
                <Link
                  key={page}
                  to={createPageUrl(page)}
                  aria-current={isActive ? 'page' : undefined}
                  className="group relative flex flex-1 flex-col items-center justify-center py-1.5 transition-colors"
                >
                  <span
                    className={cn(
                      "flex h-8 w-12 items-center justify-center rounded-full transition-all duration-200",
                      isActive
                        ? "bg-brand/15 text-on-surface ring-1 ring-brand/40 scale-105"
                        : "text-on-surface-variant opacity-85 group-hover:opacity-100"
                    )}
                  >
                    <Icon className="h-6 w-6" strokeWidth={isActive ? 2 : 1.8} />
                  </span>
                  <span className={cn(
                    "mt-0.5 text-[11px] font-semibold",
                    isActive ? "text-orange-600 dark:text-brand-soft" : "text-on-surface-variant"
                  )}>
                    {name}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
      
      <Toaster position="top-center" richColors theme={resolvedTheme} />

      {currentPageName !== 'Home' && (
        <AuthModal
          open={showAuthModal}
          onOpenChange={setShowAuthModal}
          onSuccess={() => {
            setShowAuthModal(false);
            // Reload so every page re-reads the signed-in user
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
