import React, { useState, useEffect } from 'react';
import { useTheme } from '@/lib/theme';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/lib/auth';
import { useMutation } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import {
  Bell, Shield, MapPin, Palette, LogOut, Moon, Sun, Share2, FileText, Scale, RefreshCw, LogIn, Monitor,
  Siren, WifiOff, User, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import AppHeader from '@/components/layout/AppHeader';
import SafetyButton from '@/components/common/SafetyButton';
import AuthModal from '@/components/auth/AuthModal';
import { GdSwitch, RowGroup, SettingRow } from '@/components/crew-v2/ui';

const THEMES = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

export default function Settings() {
  const { preference: themePreference, resolvedTheme, setPreference: setThemePreference } = useTheme();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [settings, setSettings] = useState({
    notifications: true,
    location_sharing: true,
    school: '',
  });

  useEffect(() => {
    auth.me().then(setUser).catch(() => {});
  }, []);

  const updateMutation = useMutation({
    mutationFn: (data) => auth.updateMe(data),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      toast.success('Settings saved!');
    },
  });

  const handleLogout = async () => {
    await auth.logout();
  };

  const handleResetOnboarding = () => {
    localStorage.removeItem('gameday_onboarding_complete');
    toast.success('Onboarding reset! Refresh to see it again.');
  };

  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ||
                   user?.email?.slice(0, 2).toUpperCase() || '??';

  return (
    <div className="gd-page">
      <AppHeader eyebrow="Your Account" title="Settings" back="Home" />

      <main className="space-y-4 px-4 pt-4">
        {/* Profile card */}
        {user ? (
          <button
            type="button"
            onClick={() => navigate(createPageUrl('UserProfile'))}
            className="gd-card flex w-full items-center gap-4 p-4 text-left"
          >
            <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand font-display text-2xl font-bold text-white ring-2 ring-brand/50 ring-offset-2 ring-offset-surface-container">
              {user.picture
                ? <img src={user.picture} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                : initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display text-2xl font-bold uppercase leading-tight text-on-surface">{user.full_name || 'User'}</span>
              <span className="block truncate text-sm text-on-surface-variant">{user.email}</span>
              <span className="mt-0.5 block text-xs font-semibold text-orange-600 dark:text-brand-soft">View profile</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-on-surface-variant" />
          </button>
        ) : (
          <section className="gd-card flex items-center gap-4 p-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant dark:bg-surface-container-highest">
              <User className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-xl font-bold uppercase text-on-surface">Not signed in</h2>
              <p className="text-sm text-on-surface-variant">Sign in to sync tailgates, crews and teams</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="gd-btn-primary flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-sm font-bold"
            >
              <LogIn className="h-4 w-4" />Sign In
            </button>
          </section>
        )}

        {/* Appearance */}
        <section className="gd-card p-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold uppercase text-on-surface">
            <Palette className="h-5 w-5 text-orange-600 dark:text-brand-soft" />Appearance
          </h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-on-surface-variant">
            {resolvedTheme === 'dark' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
            Dark mode is easier on the eyes at night games
          </p>
          <div role="radiogroup" aria-label="Theme" className="gd-segment mt-3 grid-cols-3">
            {THEMES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={themePreference === value}
                onClick={() => setThemePreference(value)}
                className={themePreference === value ? '!bg-brand !text-white shadow-[0_0_14px_-4px_rgba(249,115,22,0.6)]' : ''}
              >
                <Icon className="h-4 w-4" />{label}
              </button>
            ))}
          </div>
        </section>

        {/* Notifications */}
        <RowGroup title="Notifications">
          <SettingRow
            icon={Bell}
            tone="brand"
            title="Push notifications"
            description="Get alerts for game updates"
            control={(
              <GdSwitch
                aria-label="Push notifications"
                checked={settings.notifications}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, notifications: checked }))}
              />
            )}
          />
          <SettingRow
            icon={Siren}
            tone="danger"
            title="Friend alerts"
            description="SOS and check-ins from your crew are always on"
            control={<GdSwitch aria-label="Friend alerts (always on)" checked disabled />}
          />
        </RowGroup>

        {/* Privacy & Location */}
        <RowGroup title="Privacy & location">
          <SettingRow
            icon={MapPin}
            tone="win"
            title="Location sharing"
            description="Share with your groups"
            control={(
              <GdSwitch
                aria-label="Location sharing"
                checked={settings.location_sharing}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, location_sharing: checked }))}
              />
            )}
          />
          <SettingRow
            icon={WifiOff}
            tone="gold"
            title="Offline mode"
            description="Data is cached automatically for poor stadium signal"
            control={<GdSwitch aria-label="Offline mode (always on)" checked disabled />}
          />
        </RowGroup>

        {/* Legal */}
        <RowGroup title="Legal">
          <SettingRow icon={Shield} title="Privacy Policy" onClick={() => navigate(createPageUrl('PrivacyPolicy'))} />
          <SettingRow icon={Scale} title="Terms of Service" onClick={() => navigate(createPageUrl('TermsOfService'))} />
        </RowGroup>

        {/* Actions */}
        <RowGroup title="App">
          <SettingRow
            icon={Share2}
            tone="brand"
            title="Share app"
            onClick={() => {
              navigator.share?.({
                title: 'GameDay App',
                text: 'Check out this awesome tailgating app!',
                url: window.location.origin,
              });
            }}
          />
          <SettingRow icon={RefreshCw} title="Show onboarding again" onClick={handleResetOnboarding} />
          {user ? (
            <SettingRow icon={LogOut} title="Sign out" danger onClick={handleLogout} />
          ) : (
            <SettingRow icon={LogIn} tone="brand" title="Sign in" onClick={() => setShowAuthModal(true)} />
          )}
        </RowGroup>

        {/* App Info */}
        <div className="pb-2 pt-2 text-center text-sm text-on-surface-variant">
          <p className="font-display text-base font-bold uppercase tracking-wide">GameDay v1.0.0</p>
          <p className="mt-0.5">Made with 🏈 for fans everywhere</p>
          <div className="mt-2 flex justify-center gap-4">
            <button type="button" className="inline-flex items-center gap-1 hover:text-on-surface" onClick={() => navigate(createPageUrl('PrivacyPolicy'))}>
              <FileText className="h-3.5 w-3.5" />Privacy
            </button>
            <span aria-hidden="true">•</span>
            <button type="button" className="hover:text-on-surface" onClick={() => navigate(createPageUrl('TermsOfService'))}>
              Terms
            </button>
          </div>
        </div>
      </main>

      <SafetyButton />

      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onSuccess={setUser}
        feature="all features"
      />
    </div>
  );
}
