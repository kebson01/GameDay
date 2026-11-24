import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '@/api/client';
import { useMutation } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { 
  ArrowLeft, MapPin, Clock, Users, Camera,
  PartyPopper, Plus, X, Locate, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import SafetyButton from '@/components/common/SafetyButton';
import GameDayAssistant from '@/components/ai/GameDayAssistant';
import LoginPrompt from '@/components/auth/LoginPrompt';

const TAILGATE_TYPES = [
  { value: 'open', label: 'Open to All' },
  { value: 'student', label: 'Student' },
  { value: 'alumni', label: 'Alumni' },
  { value: 'greek', label: 'Greek Life' },
  { value: 'family', label: 'Family Friendly' },
  { value: 'sponsor', label: 'Sponsored' },
  { value: 'private', label: 'Private' },
];

const AMENITIES = [
  { value: 'grill', label: 'Grill', emoji: '🍖' },
  { value: 'tent', label: 'Tent', emoji: '⛺' },
  { value: 'games', label: 'Games', emoji: '🎮' },
  { value: 'tv', label: 'TV', emoji: '📺' },
  { value: 'music', label: 'Music', emoji: '🎵' },
  { value: 'drinks', label: 'Drinks', emoji: '🍺' },
  { value: 'food', label: 'Food', emoji: '🍔' },
  { value: 'cornhole', label: 'Cornhole', emoji: '🎯' },
];

export default function CreateTailgate() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'open',
    description: '',
    game_date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '10:00',
    end_time: '14:00',
    location: {
      lat: null,
      lng: null,
      lot_name: '',
      description: '',
    },
    is_public: true,
    password: '',
    capacity: '',
    amenities: [],
  });
  
  useEffect(() => {
    client.auth.me().then(user => {
      setUser(user);
    }).catch(() => {
      setShowLoginPrompt(true);
    });
  }, []);
  
  const getLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(loc);
        setFormData(prev => ({
          ...prev,
          location: { ...prev.location, lat: loc.lat, lng: loc.lng }
        }));
        setIsGettingLocation(false);
        toast.success('Location captured!');
      },
      (error) => {
        setIsGettingLocation(false);
        toast.error('Could not get location');
      },
      { enableHighAccuracy: true }
    );
  };
  
  const toggleAmenity = (value) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(value)
        ? prev.amenities.filter(a => a !== value)
        : [...prev.amenities, value]
    }));
  };
  
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!formData.name) throw new Error('Name is required');
      if (!formData.location.lat) throw new Error('Location is required');
      
      let photoUrl = null;
      if (photoFile) {
        const { file_url } = await client.integrations.Core.UploadFile({ file: photoFile });
        photoUrl = file_url;
      }
      
      return client.entities.Tailgate.create({
        ...formData,
        host_id: user?.id,
        host_name: user?.full_name || user?.email?.split('@')[0] || 'Anonymous',
        photo_url: photoUrl,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        rsvp_count: 0,
        checklist: [],
      });
    },
    onSuccess: (tailgate) => {
      toast.success('Tailgate created!');
      navigate(createPageUrl('TailgateDetail') + `?id=${tailgate.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  return (
    <div className="gd-page">
      {/* Header */}
      <div className="gd-header px-4 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Host a Tailgate</h1>
            <p className="text-white/80 text-sm">Share your party with others</p>
          </div>
        </div>
      </div>
      
      {/* Form */}
      <div className="px-4 py-4 space-y-6">
        {/* Photo */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <Label className="text-sm font-medium mb-2 block">Cover Photo</Label>
          <div className="border-2 border-dashed border-slate-200 rounded-xl overflow-hidden">
            {photoFile ? (
              <div className="relative">
                <img 
                  src={URL.createObjectURL(photoFile)} 
                  alt="Preview" 
                  className="w-full h-40 object-cover"
                />
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="absolute top-2 right-2"
                  onClick={() => setPhotoFile(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <label className="cursor-pointer block p-8 text-center">
                <Camera className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <span className="text-sm text-slate-500">Add a photo of your setup</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setPhotoFile(e.target.files[0])}
                />
              </label>
            )}
          </div>
        </div>
        
        {/* Basic Info */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900">Basic Info</h3>
          
          <div>
            <Label htmlFor="name">Tailgate Name *</Label>
            <Input
              id="name"
              placeholder="e.g., The Dawg House"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="type">Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TAILGATE_TYPES.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Tell people about your tailgate..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="mt-1 min-h-24"
            />
          </div>
        </div>
        
        {/* Date & Time */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-green-500" />
            Date & Time
          </h3>
          
          <div>
            <Label htmlFor="date">Game Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.game_date}
              onChange={(e) => setFormData(prev => ({ ...prev, game_date: e.target.value }))}
              className="mt-1"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start">Start Time</Label>
              <Input
                id="start"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="end">End Time</Label>
              <Input
                id="end"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>
        </div>
        
        {/* Location */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-green-500" />
            Location
          </h3>
          
          <Button 
            type="button"
            variant="outline"
            className="w-full h-14"
            onClick={getLocation}
            disabled={isGettingLocation}
          >
            <Locate className="w-5 h-5 mr-2" />
            {isGettingLocation ? 'Getting Location...' : 
              userLocation ? '✓ Location Captured' : 'Use Current Location'}
          </Button>
          
          <div>
            <Label htmlFor="lot">Lot Name</Label>
            <Input
              id="lot"
              placeholder="e.g., Lot 1, North Zone"
              value={formData.location.lot_name}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                location: { ...prev.location, lot_name: e.target.value }
              }))}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="locDesc">Location Details</Label>
            <Input
              id="locDesc"
              placeholder="e.g., Near the big oak tree"
              value={formData.location.description}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                location: { ...prev.location, description: e.target.value }
              }))}
              className="mt-1"
            />
          </div>
        </div>
        
        {/* Amenities */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900">What You're Bringing</h3>
          
          <div className="flex flex-wrap gap-2">
            {AMENITIES.map(({ value, label, emoji }) => (
              <Badge
                key={value}
                variant={formData.amenities.includes(value) ? "default" : "outline"}
                className={`cursor-pointer px-3 py-2 text-sm ${
                  formData.amenities.includes(value) 
                    ? 'bg-green-500 hover:bg-green-600' 
                    : 'hover:bg-slate-100'
                }`}
                onClick={() => toggleAmenity(value)}
              >
                {emoji} {label}
              </Badge>
            ))}
          </div>
        </div>
        
        {/* Capacity & Privacy */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-green-500" />
            Capacity & Privacy
          </h3>
          
          <div>
            <Label htmlFor="capacity">Max Capacity (optional)</Label>
            <Input
              id="capacity"
              type="number"
              placeholder="Leave empty for unlimited"
              value={formData.capacity}
              onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
              className="mt-1"
            />
          </div>
          
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <div>
              <p className="font-medium">Public Listing</p>
              <p className="text-sm text-slate-500">Show in tailgate directory</p>
            </div>
            <Switch
              checked={formData.is_public}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked }))}
            />
          </div>
          
          {!formData.is_public && (
            <div>
              <Label htmlFor="password">Private Password</Label>
              <Input
                id="password"
                type="text"
                placeholder="Password to join"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="mt-1"
              />
            </div>
          )}
        </div>
        
        {/* Submit */}
        <Button 
          className="w-full h-14 text-lg bg-green-500 hover:bg-green-600 shadow-lg"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
        >
          <PartyPopper className="w-5 h-5 mr-2" />
          {createMutation.isPending ? 'Creating...' : 'Create Tailgate'}
        </Button>
        
        {/* AI Help Button */}
        <div className="text-center">
          <GameDayAssistant 
            trigger={
              <button className="text-purple-600 text-sm font-medium flex items-center gap-2 mx-auto hover:text-purple-700">
                <Sparkles className="w-4 h-4" />
                Need help planning? Ask AI
              </button>
            }
            defaultPrompt="What should I bring to host a great tailgate for 30 people?"
          />
        </div>
      </div>
      
      <LoginPrompt 
        open={showLoginPrompt} 
        onOpenChange={(open) => {
          setShowLoginPrompt(open);
          if (!open && !user) navigate(createPageUrl('Home'));
        }}
        feature="creating tailgates"
      />
      
      <SafetyButton />
    </div>
  );
}