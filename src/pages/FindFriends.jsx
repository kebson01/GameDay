import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { 
  ArrowLeft, Users, Plus, RefreshCw, Navigation,
  Eye, EyeOff, Share2, Copy, Check, Search, Locate, WifiOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import GoogleMapView, { markerIcons } from '@/components/map/GoogleMapView';
import SafetyButton from '@/components/common/SafetyButton';
import InviteContacts from '@/components/friends/InviteContacts';
import LoginPrompt from '@/components/auth/LoginPrompt';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useOfflineQuery } from '@/hooks/useOfflineQuery';
import offlineStorage from '@/lib/offlineStorage';
import { openNavigation, getCurrentLocation as getDeviceLocation, watchLocation } from '@/lib/navigation';

const FRIEND_COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6'];

export default function FindFriends() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [sharingEnabled, setSharingEnabled] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeGroup, setActiveGroup] = useState(null);
  const { isOnline } = useNetworkStatus();
  
  // Get current user
  useEffect(() => {
    client.auth.me().then(user => {
      setUser(user);
    }).catch(() => {
      setShowLoginPrompt(true);
    });
  }, []);
  
  // Watch user location
  useEffect(() => {
    const stopWatching = watchLocation(
      (location) => {
        setUserLocation({
          lat: location.lat,
          lng: location.lng,
          accuracy: location.accuracy,
        });
      },
      (error) => console.error('Location error:', error)
    );
    
    return stopWatching;
  }, []);
  
  // Update user location in database
  useEffect(() => {
    if (!user || !userLocation || !sharingEnabled || !isOnline) return;
    
    const updateLocation = async () => {
      try {
        const existing = await client.entities.UserLocation.filter({ user_id: user.id });
        const data = {
          user_id: user.id,
          email: user.email,
          lat: userLocation.lat,
          lng: userLocation.lng,
          accuracy: userLocation.accuracy,
          sharing_enabled: sharingEnabled,
          last_updated: new Date().toISOString(),
          status: 'active',
        };
        
        if (existing.length > 0) {
          await client.entities.UserLocation.update(existing[0].id, data);
        } else {
          await client.entities.UserLocation.create(data);
        }
      } catch (error) {
        console.error('Failed to update location:', error);
      }
    };
    
    updateLocation();
    const interval = setInterval(updateLocation, 30000);
    return () => clearInterval(interval);
  }, [user, userLocation, sharingEnabled, isOnline]);
  
  // Fetch user's groups
  const { data: groups = [] } = useQuery({
    queryKey: ['my-groups', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const allGroups = await client.entities.TailgateGroup.list();
      return allGroups.filter(g => g.members?.some(m => m.email === user.email));
    },
    enabled: !!user,
  });
  
  // Fetch friend locations with offline support
  const { data: friendLocations = [], refetch: refetchLocations } = useOfflineQuery({
    queryKey: ['friend-locations', activeGroup?.id],
    queryFn: async () => {
      if (!activeGroup) return [];
      const memberEmails = activeGroup.members?.map(m => m.email) || [];
      const locations = await client.entities.UserLocation.filter({ sharing_enabled: true });
      return locations.filter(l => memberEmails.includes(l.email) && l.email !== user?.email);
    },
    offlineGetter: () => offlineStorage.getFriendLocations(),
    offlineSetter: (locations) => offlineStorage.saveFriendLocations(locations),
    enabled: !!activeGroup,
    refetchInterval: isOnline ? 10000 : false,
  });
  
  // Calculate distance between two points
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 3959;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    if (distance < 0.1) return `${Math.round(distance * 5280)} ft`;
    return `${distance.toFixed(1)} mi`;
  };
  
  // Create new group
  const createGroupMutation = useMutation({
    mutationFn: async () => {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      return client.entities.TailgateGroup.create({
        name: `${user.full_name?.split(' ')[0] || 'My'}'s Crew`,
        owner_id: user.id,
        invite_code: code,
        avatar_emoji: '🏈',
        color: '#FF6B35',
        members: [{ user_id: user.id, email: user.email, role: 'admin', location_sharing: true }],
      });
    },
    onSuccess: (group) => {
      queryClient.invalidateQueries(['my-groups']);
      setActiveGroup(group);
      toast.success('Group created!');
    },
  });
  
  // Join group
  const joinGroupMutation = useMutation({
    mutationFn: async (code) => {
      // Cloud: the server validates the code and adds you (you can't see a group before joining)
      if (typeof client.entities.TailgateGroup.join === 'function') {
        return client.entities.TailgateGroup.join(code.trim());
      }
      const groups = await client.entities.TailgateGroup.filter({ invite_code: code.toUpperCase() });
      if (groups.length === 0) throw new Error('Invalid code');
      
      const group = groups[0];
      if (group.members?.some(m => m.email === user.email)) {
        throw new Error('Already in group');
      }
      
      return client.entities.TailgateGroup.update(group.id, {
        members: [...(group.members || []), { user_id: user.id, email: user.email, role: 'member', location_sharing: true }],
      });
    },
    onSuccess: (group) => {
      queryClient.invalidateQueries(['my-groups']);
      if (group?.id) setActiveGroup(group);
      setShowJoinDialog(false);
      setJoinCode('');
      toast.success('Joined group!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const copyInviteCode = () => {
    navigator.clipboard.writeText(activeGroup?.invite_code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  // Generate markers for map
  const markers = friendLocations.map((friend, idx) => ({
    id: friend.id,
    lat: friend.lat,
    lng: friend.lng,
    icon: markerIcons.friend(FRIEND_COLORS[idx % FRIEND_COLORS.length]),
    popup: friend.display_name || friend.email?.split('@')[0] || 'Friend',
    data: friend,
  }));
  
  // Show login prompt if user is not authenticated
  if (!user) {
    return (
      <>
        <LoginPrompt 
          open={showLoginPrompt} 
          onOpenChange={(open) => {
            setShowLoginPrompt(open);
            if (!open) navigate(createPageUrl('Home'));
          }}
          feature="friend tracking and location sharing"
        />
      </>
    );
  }
  
  return (
    <div className="gd-page !pb-0">
      {/* Header */}
      <div className="gd-header px-4 pt-12 pb-4 sticky top-0 z-20">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(createPageUrl('Home'))} className="hover:bg-white/20 p-1 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold flex-1">Find Friends</h1>
          {!isOnline && (
            <div className="flex items-center gap-1 bg-white/20 text-white px-2 py-1 rounded-full text-xs">
              <WifiOff className="w-3 h-3" />
              Offline
            </div>
          )}
          <button onClick={() => refetchLocations()} disabled={!isOnline} className="hover:bg-white/20 p-1 rounded-full transition-colors">
            <RefreshCw className={`w-5 h-5 ${!isOnline ? 'opacity-50' : ''}`} />
          </button>
        </div>
        
        {/* Location Sharing Toggle */}
        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            {sharingEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span>Share Location</span>
          </div>
          <Switch 
            checked={sharingEnabled} 
            onCheckedChange={setSharingEnabled}
          />
        </div>
      </div>
      
      {/* Instagram Stories - Groups */}
      <div className="px-4 py-4 border-b border-gray-100 overflow-x-auto">
        {groups.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium mb-2">No groups yet</p>
            <p className="text-gray-500 text-sm mb-4">Create or join a group</p>
            <div className="flex gap-2 justify-center">
              <button 
                onClick={() => createGroupMutation.mutate()}
                disabled={createGroupMutation.isPending || !isOnline}
                className="px-4 py-2 bg-black text-white rounded-full text-sm font-semibold disabled:opacity-50"
              >
                Create Group
              </button>
              <button 
                onClick={() => setShowJoinDialog(true)}
                disabled={!isOnline}
                className="px-4 py-2 border border-gray-300 rounded-full text-sm font-semibold disabled:opacity-50"
              >
                Join Group
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-4">
            <button
              onClick={() => createGroupMutation.mutate()}
              disabled={!isOnline}
              className="flex flex-col items-center gap-2 shrink-0"
            >
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
                <Plus className="w-6 h-6 text-gray-400" />
              </div>
              <span className="text-xs text-gray-500">New</span>
            </button>
            {groups.map((group) => {
              const isActive = activeGroup?.id === group.id;
              return (
                <button
                  key={group.id}
                  onClick={() => setActiveGroup(group)}
                  className="flex flex-col items-center gap-2 shrink-0"
                >
                  <div className={`relative p-0.5 rounded-full ${isActive ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-pink-500' : 'bg-gray-200'}`}>
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center text-2xl bg-surface-container p-0.5"
                    >
                      <div
                        className="w-full h-full rounded-full flex items-center justify-center"
                        style={{ backgroundColor: group.color || '#FF6B35' }}
                      >
                        {group.avatar_emoji || '🏈'}
                      </div>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-surface-container flex items-center justify-center text-[10px] font-bold text-white">
                      {group.members?.filter(m => m.location_sharing)?.length || 0}
                    </div>
                  </div>
                  <span className="text-xs max-w-[64px] truncate font-medium">{group.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Map */}
      {activeGroup && (
        <div className="px-4 py-4">
          <div className="h-64 md:h-80 rounded-2xl overflow-hidden shadow-lg">
            <GoogleMapView
              center={userLocation ? [userLocation.lat, userLocation.lng] : [33.2084, -87.5503]}
              zoom={16}
              userLocation={userLocation}
              markers={markers}
              onMarkerClick={(marker) => setSelectedFriend(marker.data)}
            />
          </div>
          
          {/* Invite Code */}
          {activeGroup.invite_code && (
            <div className="mt-4 bg-surface-container rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-slate-500">Invite Code</p>
                  <p className="text-2xl font-bold tracking-wider">{activeGroup.invite_code}</p>
                </div>
                <Button 
                  variant="outline"
                  onClick={copyInviteCode}
                  className="gap-2"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <InviteContacts 
                groupId={activeGroup.id}
                groupName={activeGroup.name}
                inviteCode={activeGroup.invite_code}
              />
            </div>
          )}
        </div>
      )}
      
      {/* Friends List - Instagram Style */}
      {activeGroup && (
        <div className="px-4 pb-24">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {activeGroup.members?.length || 0} Members
          </h2>
          <div className="space-y-0 divide-y divide-gray-100">
            {friendLocations.map((friend, idx) => {
              const initials = friend?.email?.slice(0, 2).toUpperCase() || '??';
              const distance = userLocation ? calculateDistance(
                userLocation.lat, userLocation.lng,
                friend.lat, friend.lng
              ) : null;
              const color = FRIEND_COLORS[idx % FRIEND_COLORS.length];
              
              return (
                <div key={friend.id} className="flex items-center gap-3 py-3">
                  <div className="relative">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}
                    >
                      {initials}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-surface-container" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{friend?.display_name || friend?.email?.split('@')[0] || 'Friend'}</p>
                    {distance && <p className="text-sm text-gray-500">{distance} away</p>}
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await openNavigation(
                          friend.lat,
                          friend.lng,
                          friend.display_name || friend.email?.split('@')[0] || 'Friend',
                          userLocation
                        );
                      } catch (error) {
                        console.error('Navigation error:', error);
                      }
                    }}
                    className="px-4 py-1.5 bg-orange-500 text-white rounded-full text-sm font-semibold"
                  >
                    Navigate
                  </button>
                </div>
              );
            })}
            {friendLocations.length === 0 && (
              <div className="text-center py-12">
                <Navigation className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No friends sharing location</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Join Group Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join a Group</DialogTitle>
            <DialogDescription>
              Enter the invite code shared by your friend
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Enter code (e.g., ABC123)"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="text-center text-2xl font-bold tracking-wider"
              maxLength={6}
            />
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowJoinDialog(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-orange-500 hover:bg-orange-600"
                onClick={() => joinGroupMutation.mutate(joinCode)}
                disabled={joinCode.length < 6 || joinGroupMutation.isPending}
              >
                {joinGroupMutation.isPending ? 'Joining...' : 'Join'}
              </Button>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-500">or</p>
              <Button 
                variant="link"
                onClick={() => {
                  setShowJoinDialog(false);
                  createGroupMutation.mutate();
                }}
              >
                Create a new group instead
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <LoginPrompt 
        open={showLoginPrompt} 
        onOpenChange={(open) => {
          setShowLoginPrompt(open);
          if (!open && !user) navigate(createPageUrl('Home'));
        }}
        feature="friend tracking and location sharing"
      />
      
      <SafetyButton />
    </div>
  );
}
