import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { 
  ArrowLeft, MapPin, Search, Filter, Navigation,
  Droplets, Utensils, Cross, Banknote, DoorOpen, Bath, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import GoogleMapView, { markerIcons } from '@/components/map/GoogleMapView';
import SafetyButton from '@/components/common/SafetyButton';
import { openNavigation, getCurrentLocation as getDeviceLocation } from '@/lib/navigation';

const AMENITY_TYPES = [
  { value: 'restroom', label: 'Restrooms', icon: Bath, color: '#6366F1', emoji: '🚻' },
  { value: 'food', label: 'Food & Drinks', icon: Utensils, color: '#F59E0B', emoji: '🍔' },
  { value: 'first_aid', label: 'First Aid', icon: Cross, color: '#EF4444', emoji: '🏥' },
  { value: 'water', label: 'Water Stations', icon: Droplets, color: '#0EA5E9', emoji: '💧' },
  { value: 'atm', label: 'ATMs', icon: Banknote, color: '#22C55E', emoji: '💵' },
  { value: 'entrance', label: 'Stadium Entrances', icon: DoorOpen, color: '#8B5CF6', emoji: '🚪' },
];

// Create amenity icons dynamically
const createAmenityIcon = (type) => {
  const amenity = AMENITY_TYPES.find(a => a.value === type);
  if (!amenity) return markerIcons.tailgate;
  
  return {
    url: 'data:image/svg+xml,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="16" fill="${amenity.color}" stroke="white" stroke-width="2"/>
        <text x="18" y="24" text-anchor="middle" font-size="14">${amenity.emoji}</text>
      </svg>
    `),
    scaledSize: { width: 36, height: 36 },
    anchor: { x: 18, y: 18 },
  };
};

export default function CampusMap() {
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState(null);
  const [selectedFilters, setSelectedFilters] = useState(['restroom', 'food', 'first_aid']);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAmenity, setSelectedAmenity] = useState(null);
  
  useEffect(() => {
    getDeviceLocation()
      .then(loc => setUserLocation({
        lat: loc.lat,
        lng: loc.lng,
        accuracy: loc.accuracy,
      }))
      .catch(() => {});
  }, []);
  
  // Fetch school data with amenities
  const { data: schools = [] } = useQuery({
    queryKey: ['schools'],
    queryFn: () => client.entities.School.list(),
  });
  
  // Fetch tailgates for map
  const { data: tailgates = [] } = useQuery({
    queryKey: ['map-tailgates'],
    queryFn: () => client.entities.Tailgate.filter({ is_public: true }),
  });
  
  // Fetch user's parked car
  const [parkedCar, setParkedCar] = useState(null);
  useEffect(() => {
    client.auth.me().then(async (user) => {
      const cars = await client.entities.ParkedCar.filter({ user_id: user.id }, '-created_date', 1);
      if (cars.length > 0) setParkedCar(cars[0]);
    }).catch(() => {});
  }, []);
  
  const school = schools[0];
  
  // Generate markers
  const markers = [];
  
  // Add amenity markers
  if (school?.amenities) {
    school.amenities.forEach((amenity, idx) => {
      if (selectedFilters.includes(amenity.type)) {
        markers.push({
          id: `amenity-${idx}`,
          lat: amenity.lat,
          lng: amenity.lng,
          icon: createAmenityIcon(amenity.type),
          popup: amenity.name || amenity.type,
          type: 'amenity',
          data: amenity,
        });
      }
    });
  }
  
  // Add tailgate markers
  tailgates.forEach(t => {
    if (t.location?.lat && t.location?.lng) {
      markers.push({
        id: `tailgate-${t.id}`,
        lat: t.location.lat,
        lng: t.location.lng,
        icon: markerIcons.tailgate,
        popup: t.name,
        type: 'tailgate',
        data: t,
      });
    }
  });
  
  // Add car marker
  if (parkedCar) {
    markers.push({
      id: 'my-car',
      lat: parkedCar.lat,
      lng: parkedCar.lng,
      icon: markerIcons.car,
      popup: 'Your Car',
      type: 'car',
      data: parkedCar,
    });
  }
  
  const toggleFilter = (value) => {
    setSelectedFilters(prev =>
      prev.includes(value)
        ? prev.filter(f => f !== value)
        : [...prev, value]
    );
  };
  
  const navigateToAmenity = async (amenity) => {
    if (!amenity.lat || !amenity.lng) return;
    try {
      await openNavigation(
        amenity.lat,
        amenity.lng,
        amenity.name || amenity.type,
        userLocation
      );
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };
  
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
          <div>
            <h1 className="text-xl font-bold">Campus Map</h1>
            <p className="text-white/80 text-sm">Find amenities & navigate</p>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <Input
            placeholder="Search locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/90 border-0 h-12 text-black placeholder:text-slate-500"
          />
        </div>
      </div>
      
      {/* Filter Pills */}
      <div className="px-4 py-3 bg-white shadow-sm overflow-x-auto">
        <div className="flex gap-2">
          {AMENITY_TYPES.map(({ value, label, icon: Icon, color }) => (
            <Badge
              key={value}
              variant={selectedFilters.includes(value) ? "default" : "outline"}
              className={`shrink-0 cursor-pointer px-3 py-2 gap-1.5 transition-all ${
                selectedFilters.includes(value) 
                  ? 'text-white' 
                  : 'hover:bg-slate-100'
              }`}
              style={selectedFilters.includes(value) ? { backgroundColor: color } : {}}
              onClick={() => toggleFilter(value)}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Badge>
          ))}
        </div>
      </div>
      
      {/* Map */}
      <div className="h-[calc(100vh-200px)] relative">
        <GoogleMapView
          center={userLocation ? [userLocation.lat, userLocation.lng] : school?.stadium_location ? [school.stadium_location.lat, school.stadium_location.lng] : [33.2084, -87.5503]}
          zoom={15}
          userLocation={userLocation}
          markers={markers}
          onMarkerClick={(marker) => setSelectedAmenity(marker)}
        />
        
        {/* Selected Amenity Card */}
        {selectedAmenity && (
          <div className="absolute bottom-4 left-4 right-4 z-20">
            <div className="bg-white rounded-2xl shadow-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl text-white"
                    style={{ backgroundColor: AMENITY_TYPES.find(a => a.value === selectedAmenity.data?.type)?.color || '#6366F1' }}
                  >
                    {selectedAmenity.type === 'tailgate' ? '🎉' : 
                     selectedAmenity.type === 'car' ? '🚗' :
                     AMENITY_TYPES.find(a => a.value === selectedAmenity.data?.type)?.emoji || '📍'}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">
                      {selectedAmenity.data?.name || selectedAmenity.popup}
                    </p>
                    <p className="text-sm text-slate-500 capitalize">
                      {selectedAmenity.type === 'amenity' ? selectedAmenity.data?.type?.replace('_', ' ') : selectedAmenity.type}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setSelectedAmenity(null)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <Button 
                className="w-full bg-purple-500 hover:bg-purple-600"
                onClick={() => navigateToAmenity(selectedAmenity.data || { lat: selectedAmenity.lat, lng: selectedAmenity.lng })}
              >
                <Navigation className="w-4 h-4 mr-2" />
                Navigate Here
              </Button>
            </div>
          </div>
        )}
        
        {/* Legend */}
        <div className="absolute top-4 right-4 z-10">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="secondary" size="sm" className="shadow-lg">
                <Filter className="w-4 h-4 mr-2" />
                Legend
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle>Map Legend</SheetTitle>
              </SheetHeader>
              <div className="py-6 space-y-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-slate-700">Amenities</h4>
                  {AMENITY_TYPES.map(({ value, label, icon: Icon, color }) => (
                    <div key={value} className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                        style={{ backgroundColor: color }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm">{label}</span>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-3 pt-4 border-t">
                  <h4 className="font-medium text-slate-700">Other</h4>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white">🎉</div>
                    <span className="text-sm">Tailgates</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">🚗</div>
                    <span className="text-sm">Your Car</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white">📍</div>
                    <span className="text-sm">Your Location</span>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      
      <SafetyButton />
    </div>
  );
}
