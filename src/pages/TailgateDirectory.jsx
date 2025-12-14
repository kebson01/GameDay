import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { 
  ArrowLeft, Search, Filter, Plus, PartyPopper,
  MapPin, Users, X, SlidersHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TailgateCard from '@/components/common/TailgateCard';
import MapView, { tailgateIcon } from '@/components/map/MapView';
import SafetyButton from '@/components/common/SafetyButton';
import LoginPrompt from '@/components/auth/LoginPrompt';

const TAILGATE_TYPES = [
  { value: 'open', label: 'Open to All', emoji: '🎉' },
  { value: 'student', label: 'Student', emoji: '🎓' },
  { value: 'alumni', label: 'Alumni', emoji: '🏛️' },
  { value: 'greek', label: 'Greek Life', emoji: '🏛️' },
  { value: 'family', label: 'Family', emoji: '👨‍👩‍👧‍👦' },
  { value: 'sponsor', label: 'Sponsored', emoji: '⭐' },
  { value: 'private', label: 'Private', emoji: '🔒' },
];

export default function TailgateDirectory() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [viewMode, setViewMode] = useState('list');
  const [userLocation, setUserLocation] = useState(null);
  const [selectedTailgate, setSelectedTailgate] = useState(null);
  const [user, setUser] = useState(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  
  useEffect(() => {
    client.auth.me().then(setUser).catch(() => {});
  }, []);
  
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => setUserLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      }),
      () => {}
    );
  }, []);
  
  const { data: tailgates = [], isLoading } = useQuery({
    queryKey: ['tailgates'],
    queryFn: () => client.entities.Tailgate.filter({ is_public: true }, '-created_date'),
  });
  
  // Filter tailgates
  const filteredTailgates = tailgates.filter((t) => {
    const matchesSearch = !searchQuery || 
      t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.host_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.location?.lot_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = selectedTypes.length === 0 || selectedTypes.includes(t.type);
    
    return matchesSearch && matchesType;
  });
  
  const toggleType = (type) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };
  
  // Map markers
  const markers = filteredTailgates
    .filter(t => t.location?.lat && t.location?.lng)
    .map(t => ({
      id: t.id,
      lat: t.location.lat,
      lng: t.location.lng,
      icon: tailgateIcon,
      popup: t.name,
      data: t,
    }));
  
  return (
    <div className="gd-page !pb-0">
      {/* Header */}
      <div className="gd-header px-4 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => navigate(createPageUrl('Home'))}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Tailgate Directory</h1>
            <p className="text-white/80 text-sm">{filteredTailgates.length} parties found</p>
          </div>
          <Button 
            className="bg-white text-orange-600 hover:bg-white/90"
            onClick={() => {
              if (!user) {
                setShowLoginPrompt(true);
              } else {
                navigate(createPageUrl('CreateTailgate'));
              }
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Host
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search tailgates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/90 border-0 h-12"
          />
        </div>
      </div>
      
      {/* Filters & View Toggle */}
      <div className="px-4 py-3 bg-white shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-1">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="shrink-0">
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Filters
                  {selectedTypes.length > 0 && (
                    <Badge className="ml-2 bg-orange-500 text-white">
                      {selectedTypes.length}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-auto max-h-[70vh]">
                <SheetHeader>
                  <SheetTitle>Filter Tailgates</SheetTitle>
                </SheetHeader>
                <div className="py-6 space-y-6">
                  <div>
                    <h4 className="font-medium mb-3">Type</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {TAILGATE_TYPES.map(({ value, label, emoji }) => (
                        <label 
                          key={value}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            selectedTypes.includes(value) 
                              ? 'border-orange-500 bg-orange-50' 
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <Checkbox
                            checked={selectedTypes.includes(value)}
                            onCheckedChange={() => toggleType(value)}
                          />
                          <span className="text-lg">{emoji}</span>
                          <span className="text-sm font-medium">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  {selectedTypes.length > 0 && (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setSelectedTypes([])}
                    >
                      Clear All Filters
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
            
            {selectedTypes.map(type => (
              <Badge 
                key={type}
                variant="secondary"
                className="shrink-0 gap-1 cursor-pointer hover:bg-slate-200"
                onClick={() => toggleType(type)}
              >
                {TAILGATE_TYPES.find(t => t.value === type)?.emoji}
                {TAILGATE_TYPES.find(t => t.value === type)?.label}
                <X className="w-3 h-3" />
              </Badge>
            ))}
          </div>
          
          <Tabs value={viewMode} onValueChange={setViewMode} className="ml-2">
            <TabsList className="h-9">
              <TabsTrigger value="list" className="text-xs px-2">List</TabsTrigger>
              <TabsTrigger value="map" className="text-xs px-2">Map</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-4 py-4 pb-24">
        {viewMode === 'map' ? (
          <div className="h-[calc(100vh-220px)] rounded-2xl overflow-hidden shadow-lg">
            <MapView
              center={userLocation ? [userLocation.lat, userLocation.lng] : [33.2084, -87.5503]}
              zoom={15}
              userLocation={userLocation}
              markers={markers}
              onMarkerClick={(marker) => setSelectedTailgate(marker.data)}
            />
            
            {/* Selected Tailgate Card */}
            {selectedTailgate && (
              <div className="absolute bottom-4 left-4 right-4 z-20">
                <TailgateCard 
                  tailgate={selectedTailgate}
                  onClick={() => navigate(createPageUrl('TailgateDetail') + `?id=${selectedTailgate.id}`)}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTailgates.map((tailgate) => (
              <TailgateCard 
                key={tailgate.id}
                tailgate={tailgate}
                onClick={() => navigate(createPageUrl('TailgateDetail') + `?id=${tailgate.id}`)}
              />
            ))}
            
            {filteredTailgates.length === 0 && (
              <div className="col-span-full text-center py-12 bg-white rounded-2xl">
                <PartyPopper className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="font-bold text-slate-900 mb-2">No tailgates found</h3>
                <p className="text-slate-500 mb-4">Try adjusting your filters or search</p>
                <Button 
                  className="bg-orange-500 hover:bg-orange-600"
                  onClick={() => {
                    if (!user) {
                      setShowLoginPrompt(true);
                    } else {
                      navigate(createPageUrl('CreateTailgate'));
                    }
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Host a Tailgate
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      
      <LoginPrompt 
        open={showLoginPrompt} 
        onOpenChange={setShowLoginPrompt}
        feature="creating tailgates"
      />
      
      <SafetyButton />
    </div>
  );
}