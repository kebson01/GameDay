import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/lib/auth';
import { useMutation } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { 
  ArrowLeft, User, Bell, Shield, MapPin, Palette,
  LogOut, ChevronRight, Moon, Sun, Smartphone, Share2,
  FileText, Scale, HelpCircle, RefreshCw, LogIn
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import SafetyButton from '@/components/common/SafetyButton';
import AuthModal from '@/components/auth/AuthModal';

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [settings, setSettings] = useState({
    notifications: true,
    location_sharing: true,
    dark_mode: false,
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
    await auth.logout('/');
  };

  const handleResetOnboarding = () => {
    localStorage.removeItem('gameday_onboarding_complete');
    toast.success('Onboarding reset! Refresh to see it again.');
  };

  const handleAuthSuccess = (loggedInUser) => {
    setUser(loggedInUser);
  };
  
  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 
                   user?.email?.slice(0, 2).toUpperCase() || '??';
  
  return (
    <div className="gd-page">
      {/* Header */}
      <div className="gd-header px-4 pt-6 pb-8">
        <div className="flex items-center gap-3 mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => navigate(createPageUrl('Home'))}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
        
        {/* Profile Card */}
        {user ? (
          <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16 border-2 border-white/30">
                <AvatarFallback className="bg-orange-500 text-white text-xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-xl font-bold">{user?.full_name || 'User'}</h2>
                <p className="text-white/70">{user?.email}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Not signed in</h2>
                <p className="text-white/70 text-sm">Sign in to access all features</p>
              </div>
              <Button 
                onClick={() => setShowAuthModal(true)}
                className="bg-white text-slate-900 hover:bg-white/90"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Settings Sections */}
      <div className="px-4 py-4 space-y-4 -mt-4">
        {/* Notifications */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-orange-500" />
              Notifications
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-slate-500">Get alerts for game updates</p>
              </div>
              <Switch 
                checked={settings.notifications}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, notifications: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Friend Alerts</p>
                <p className="text-sm text-slate-500">When friends send SOS or check-in</p>
              </div>
              <Switch checked={true} />
            </div>
          </div>
        </div>
        
        {/* Privacy & Location */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-500" />
              Privacy & Location
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Location Sharing</p>
                <p className="text-sm text-slate-500">Share with your groups</p>
              </div>
              <Switch 
                checked={settings.location_sharing}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, location_sharing: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Offline Mode</p>
                <p className="text-sm text-slate-500">Cache data for poor signal</p>
              </div>
              <Switch checked={true} />
            </div>
          </div>
        </div>
        
        {/* Appearance */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Palette className="w-5 h-5 text-purple-500" />
              Appearance
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {settings.dark_mode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                <div>
                  <p className="font-medium">Dark Mode</p>
                  <p className="text-sm text-slate-500">Easier on the eyes</p>
                </div>
              </div>
              <Switch 
                checked={settings.dark_mode}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, dark_mode: checked }))}
              />
            </div>
          </div>
        </div>

        {/* Legal */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Scale className="w-5 h-5 text-blue-500" />
              Legal
            </h3>
          </div>
          <button 
            className="w-full p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors border-b border-slate-100"
            onClick={() => navigate(createPageUrl('PrivacyPolicy'))}
          >
            <FileText className="w-5 h-5 text-slate-500" />
            <span className="flex-1 text-left font-medium">Privacy Policy</span>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
          <button 
            className="w-full p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors"
            onClick={() => navigate(createPageUrl('TermsOfService'))}
          >
            <Scale className="w-5 h-5 text-slate-500" />
            <span className="flex-1 text-left font-medium">Terms of Service</span>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        
        {/* Actions */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button 
            className="w-full p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors border-b border-slate-100"
            onClick={() => {
              navigator.share?.({
                title: 'GameDay App',
                text: 'Check out this awesome tailgating app!',
                url: window.location.origin,
              });
            }}
          >
            <Share2 className="w-5 h-5 text-orange-500" />
            <span className="flex-1 text-left font-medium">Share App</span>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
          <button 
            className="w-full p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors border-b border-slate-100"
            onClick={handleResetOnboarding}
          >
            <RefreshCw className="w-5 h-5 text-slate-500" />
            <span className="flex-1 text-left font-medium">Show Onboarding Again</span>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
          {user ? (
            <button 
              className="w-full p-4 flex items-center gap-3 hover:bg-red-50 transition-colors text-red-600"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
              <span className="flex-1 text-left font-medium">Sign Out</span>
            </button>
          ) : (
            <button 
              className="w-full p-4 flex items-center gap-3 hover:bg-orange-50 transition-colors text-orange-600"
              onClick={() => setShowAuthModal(true)}
            >
              <LogIn className="w-5 h-5" />
              <span className="flex-1 text-left font-medium">Sign In</span>
            </button>
          )}
        </div>
        
        {/* App Info */}
        <div className="text-center text-slate-400 text-sm pt-4">
          <p>GameDay v1.0.0</p>
          <p className="mt-1">Made with 🏈 for fans everywhere</p>
          <div className="flex justify-center gap-4 mt-3">
            <button 
              className="hover:text-slate-600"
              onClick={() => navigate(createPageUrl('PrivacyPolicy'))}
            >
              Privacy
            </button>
            <span>•</span>
            <button 
              className="hover:text-slate-600"
              onClick={() => navigate(createPageUrl('TermsOfService'))}
            >
              Terms
            </button>
          </div>
        </div>
      </div>
      
      <SafetyButton />
      
      {/* Auth Modal */}
      <AuthModal 
        open={showAuthModal} 
        onOpenChange={setShowAuthModal}
        onSuccess={handleAuthSuccess}
        feature="all features"
      />
    </div>
  );
}
