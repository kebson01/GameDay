import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Users, Car, PartyPopper, Map, Radio, Newspaper, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Toaster } from 'sonner';
import { auth } from '@/lib/auth';
import OfflineIndicator from '@/components/common/OfflineIndicator';
import AuthModal from '@/components/auth/AuthModal';

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  
  const [showAuthModal, setShowAuthModal] = useState(false);

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
    { name: 'Home', icon: Home, page: 'Home' },
    { name: 'Live', icon: Radio, page: 'GameDay' },
    { name: 'Teams', icon: PartyPopper, page: 'MyTeams' },
    { name: 'Friends', icon: Users, page: 'FindFriends' },
    { name: user ? 'Profile' : 'Map', icon: user ? User : Map, page: user ? 'UserProfile' : 'CampusMap' },
  ];
  
  const showNav = !['Settings', 'PrivacyPolicy', 'TermsOfService'].includes(currentPageName);
  
  return (
    <div className="min-h-screen bg-slate-50">
      <style>{`
        :root {
          --primary: #F97316;
          --primary-foreground: #FFFFFF;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background: #F8FAFC;
        }
        
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
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 safe-area-pb shadow-lg">
          <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
            {navItems.map(({ name, icon: Icon, page }) => {
              const isActive = currentPageName === page;
              return (
                <Link
                  key={page}
                  to={createPageUrl(page)}
                  className={cn(
                    "flex flex-col items-center justify-center flex-1 py-2 rounded-xl mx-1 transition-all",
                    isActive ? "bg-orange-50" : "hover:bg-slate-50"
                  )}
                >
                  <Icon 
                    className={cn(
                      "w-6 h-6 transition-colors",
                      isActive ? "text-orange-500" : "text-slate-400"
                    )}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span className={cn(
                    "text-[10px] mt-0.5 font-medium",
                    isActive ? "text-orange-500" : "text-slate-400"
                  )}>
                    {name}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
      
      <Toaster position="top-center" richColors />

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
