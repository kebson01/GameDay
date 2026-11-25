import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User } from 'lucide-react';
import SafetyButton from '@/components/common/SafetyButton';
import { auth } from '@/lib/auth';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

/**
 * Shared screen header (Stitch "Tailgate Companion" style): orange logo tile
 * or back button, small orange eyebrow label, condensed uppercase title,
 * optional extra actions, the safety/SOS shield and profile avatar.
 * Glass surface in both themes; sticks to the top while scrolling.
 */
export default function AppHeader({
  eyebrow = 'Saturday Live',
  title,
  subtitle,
  back, // true -> navigate(-1); string -> page name
  actions,
  showProfile = true,
  className,
  children, // optional row under the title (chips, tabs, search)
}) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const goBack = () => {
    if (typeof back === 'string') navigate(createPageUrl(back));
    else if (window.history.length > 1) navigate(-1);
    else navigate(createPageUrl('Home'));
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-30 bg-surface/85 backdrop-blur-xl border-b border-outline-variant/60',
        'shadow-[0_1px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_8px_rgba(0,0,0,0.3)]',
        'pt-[max(0.75rem,env(safe-area-inset-top))]',
        className
      )}
    >
      <div className="flex h-16 items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-3">
          {back ? (
            <button
              type="button"
              onClick={goBack}
              aria-label="Back"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-container-high text-on-surface"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate(createPageUrl('Home'))}
              aria-label="GameDay home"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-[0_0_16px_-2px_rgba(249,115,22,0.45)]"
            >
              <span className="text-xl leading-none" aria-hidden="true">🏈</span>
            </button>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <p className="truncate text-[11px] font-bold uppercase tracking-[0.14em] text-orange-600 dark:text-brand-soft">
                {eyebrow}
              </p>
            )}
            <h1 className="truncate font-display text-[22px] font-bold uppercase leading-tight tracking-tight text-on-surface">
              {title}
            </h1>
            {subtitle && <p className="truncate text-xs text-on-surface-variant">{subtitle}</p>}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {actions}
          <SafetyButton variant="header" />
          {showProfile && (
            <button
              type="button"
              aria-label={user ? 'Your profile' : 'Settings'}
              onClick={() => navigate(createPageUrl(user ? 'UserProfile' : 'Settings'))}
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-brand/15 ring-2 ring-brand/60 text-orange-600 dark:text-brand-soft"
            >
              {user?.picture ? (
                <img src={user.picture} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
              ) : user?.full_name ? (
                <span className="font-display text-base font-bold">{user.full_name.charAt(0).toUpperCase()}</span>
              ) : (
                <User className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>
      {children && <div className="px-4 pb-3">{children}</div>}
    </header>
  );
}
