import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { 
  ArrowLeft, MapPin, Clock, Users, Share2, Navigation,
  Lock, Check, Plus, Trash2, Edit, UserPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import MapView, { tailgateIcon } from '@/components/map/MapView';
import SafetyButton from '@/components/common/SafetyButton';
import LoginPrompt from '@/components/auth/LoginPrompt';
import { openNavigation, getCurrentLocation as getDeviceLocation } from '@/lib/navigation';

const typeColors = {
  student: 'bg-blue-100 text-blue-700',
  alumni: 'bg-purple-100 text-purple-700',
  greek: 'bg-pink-100 text-pink-700',
  family: 'bg-green-100 text-green-700',
  open: 'bg-orange-100 text-orange-700',
  private: 'bg-slate-100 text-slate-700',
  sponsor: 'bg-yellow-100 text-yellow-700',
};

const amenityEmojis = {
  grill: '🍖',
  tent: '⛺',
  games: '🎮',
  tv: '📺',
  music: '🎵',
  drinks: '🍺',
  food: '🍔',
  cornhole: '🎯',
};

export default function TailgateDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [showChecklistDialog, setShowChecklistDialog] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  
  const urlParams = new URLSearchParams(window.location.search);
  const tailgateId = urlParams.get('id');
  
  useEffect(() => {
    client.auth.me().then(setUser).catch(() => {});
    getDeviceLocation()
      .then(loc => setUserLocation({ lat: loc.lat, lng: loc.lng }))
      .catch(() => {});
  }, []);
  
  const { data: tailgate, isLoading } = useQuery({
    queryKey: ['tailgate', tailgateId],
    queryFn: () => client.entities.Tailgate.filter({ id: tailgateId }).then(r => r[0]),
    enabled: !!tailgateId,
  });
  
  const isHost = user?.id === tailgate?.host_id;
  
  // RSVP mutation
  const rsvpMutation = useMutation({
    mutationFn: () => client.entities.Tailgate.update(tailgateId, {
      rsvp_count: (tailgate?.rsvp_count || 0) + 1
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['tailgate', tailgateId]);
      toast.success("You're in! See you there 🎉");
    },
  });
  
  // Update checklist
  const updateChecklistMutation = useMutation({
    mutationFn: (checklist) => client.entities.Tailgate.update(tailgateId, { checklist }),
    onSuccess: () => {
      queryClient.invalidateQueries(['tailgate', tailgateId]);
    },
  });
  
  const addChecklistItem = () => {
    if (!newItem.trim()) return;
    const updated = [
      ...(tailgate?.checklist || []),
      { item: newItem, assigned_to: newAssignee, completed: false }
    ];
    updateChecklistMutation.mutate(updated);
    setNewItem('');
    setNewAssignee('');
  };
  
  const toggleChecklistItem = (index) => {
    const updated = tailgate.checklist.map((item, i) => 
      i === index ? { ...item, completed: !item.completed } : item
    );
    updateChecklistMutation.mutate(updated);
  };
  
  const removeChecklistItem = (index) => {
    const updated = tailgate.checklist.filter((_, i) => i !== index);
    updateChecklistMutation.mutate(updated);
  };
  
  const handleNavigation = async () => {
    if (!tailgate?.location?.lat || !tailgate?.location?.lng) return;
    try {
      await openNavigation(
        tailgate.location.lat,
        tailgate.location.lng,
        tailgate.name,
        userLocation
      );
    } catch (error) {
      toast.error('Could not open navigation');
    }
  };
  
  const shareTailgate = () => {
    navigator.share?.({
      title: tailgate?.name,
      text: `Check out this tailgate: ${tailgate?.name}`,
      url: window.location.href,
    }).catch(() => {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied!');
    });
  };
  
  if (isLoading) {
    return (
      <div className="gd-page flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }
  
  if (!tailgate) {
    return (
      <div className="gd-page flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-slate-500 mb-4">Tailgate not found</p>
          <Button onClick={() => navigate(createPageUrl('TailgateDirectory'))}>
            Browse Tailgates
          </Button>
        </div>
      </div>
    );
  }
  
  const markers = tailgate.location?.lat ? [{
    id: tailgate.id,
    lat: tailgate.location.lat,
    lng: tailgate.location.lng,
    icon: tailgateIcon,
    popup: tailgate.name,
  }] : [];
  
  return (
    <div className="gd-page">
      {/* Hero */}
      <div className="relative h-64">
        {tailgate.photo_url ? (
          <img 
            src={tailgate.photo_url} 
            alt={tailgate.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-orange-400 via-red-500 to-pink-500" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute inset-0 bg-black/10" />
        
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="icon" 
            className="bg-black/30 text-white hover:bg-black/50"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="bg-black/30 text-white hover:bg-black/50"
              onClick={shareTailgate}
            >
              <Share2 className="w-5 h-5" />
            </Button>
            {isHost && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="bg-black/30 text-white hover:bg-black/50"
                onClick={() => navigate(createPageUrl('CreateTailgate') + `?edit=${tailgateId}`)}
              >
                <Edit className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Title */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <Badge className={typeColors[tailgate.type] || typeColors.open}>
            {tailgate.type}
          </Badge>
          <h1 className="text-2xl font-bold text-white mt-2">{tailgate.name}</h1>
          <p className="text-white/80">Hosted by {tailgate.host_name}</p>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-4 py-4 space-y-4 -mt-4">
        {/* Quick Info */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Time</p>
                <p className="font-semibold">{tailgate.start_time} - {tailgate.end_time}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Attending</p>
                <p className="font-semibold">
                  {tailgate.rsvp_count || 0}
                  {tailgate.capacity && `/${tailgate.capacity}`}
                </p>
              </div>
            </div>
          </div>
          
          {tailgate.game_date && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                🏈
              </div>
              <div>
                <p className="text-sm text-slate-500">Game Day</p>
                <p className="font-semibold">{tailgate.game_date ? format(parseISO(tailgate.game_date), 'EEEE, MMMM d, yyyy') : 'Date TBD'}</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Description */}
        {tailgate.description && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-2">About</h3>
            <p className="text-slate-600">{tailgate.description}</p>
          </div>
        )}
        
        {/* Amenities */}
        {tailgate.amenities?.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-3">What's There</h3>
            <div className="flex flex-wrap gap-2">
              {tailgate.amenities.map((amenity, idx) => (
                <Badge key={idx} variant="outline" className="px-3 py-2 text-sm">
                  {amenityEmojis[amenity] || '✨'} {amenity}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Location */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4">
            <h3 className="font-bold text-slate-900 mb-2">Location</h3>
            <div className="flex items-center gap-2 text-slate-600">
              <MapPin className="w-4 h-4 text-orange-500" />
              {tailgate.location?.lot_name || tailgate.location?.description || 'Location details'}
            </div>
          </div>
          
          {tailgate.location?.lat && (
            <>
              <div className="h-40">
                <MapView
                  center={[tailgate.location.lat, tailgate.location.lng]}
                  zoom={16}
                  userLocation={userLocation}
                  markers={markers}
                />
              </div>
              <div className="p-4 border-t">
                <Button 
                  className="w-full bg-orange-500 hover:bg-orange-600"
                  onClick={handleNavigation}
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Get Directions
                </Button>
              </div>
            </>
          )}
        </div>
        
        {/* Checklist */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900">Supply Checklist</h3>
            {isHost && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowChecklistDialog(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            )}
          </div>
          
          {tailgate.checklist?.length > 0 ? (
            <div className="space-y-2">
              {tailgate.checklist.map((item, idx) => (
                <div 
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                    item.completed ? 'bg-orange-50 border-orange-200' : 'border-slate-200'
                  }`}
                >
                  <Checkbox
                    checked={item.completed}
                    onCheckedChange={() => toggleChecklistItem(idx)}
                  />
                  <div className="flex-1">
                    <p className={item.completed ? 'line-through text-slate-400' : 'text-slate-900'}>
                      {item.item}
                    </p>
                    {item.assigned_to && (
                      <p className="text-sm text-slate-500">📍 {item.assigned_to}</p>
                    )}
                  </div>
                  {isHost && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => removeChecklistItem(idx)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-4">No items yet</p>
          )}
        </div>
        
        {/* RSVP Button */}
        {!isHost && (
          <Button 
            className="w-full h-14 text-lg bg-orange-500 hover:bg-orange-600 shadow-lg"
            onClick={() => {
              if (!user) {
                setShowLoginPrompt(true);
              } else {
                rsvpMutation.mutate();
              }
            }}
            disabled={rsvpMutation.isPending || (tailgate.capacity && tailgate.rsvp_count >= tailgate.capacity)}
          >
            <UserPlus className="w-5 h-5 mr-2" />
            {rsvpMutation.isPending ? 'Joining...' : "I'm Going!"}
          </Button>
        )}
      </div>
      
      {/* Add Checklist Dialog */}
      <Dialog open={showChecklistDialog} onOpenChange={setShowChecklistDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Checklist Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Item (e.g., Cooler with ice)"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
            />
            <Input
              placeholder="Assigned to (optional)"
              value={newAssignee}
              onChange={(e) => setNewAssignee(e.target.value)}
            />
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowChecklistDialog(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-orange-500 hover:bg-orange-600"
                onClick={() => {
                  addChecklistItem();
                  setShowChecklistDialog(false);
                }}
              >
                Add Item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <LoginPrompt 
        open={showLoginPrompt} 
        onOpenChange={setShowLoginPrompt}
        feature="RSVP to tailgates"
      />
      
      <SafetyButton />
    </div>
  );
}