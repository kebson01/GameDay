import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/lib/auth';
import { client } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { 
  ArrowLeft, Car, MapPin, Navigation, Camera, Clock, 
  Trash2, Plus, Check, Loader2, ParkingCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import AuthModal from '@/components/auth/AuthModal';
import { MapSkeleton } from '@/components/common/LoadingSkeleton';
import { openNavigation, getCurrentLocation as getDeviceLocation } from '@/lib/navigation';

export default function CarLocator() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [notes, setNotes] = useState('');
  const [lotName, setLotName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  
  useEffect(() => {
    auth.me()
      .then(setUser)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Get user location for navigation
  useEffect(() => {
    getDeviceLocation()
      .then(loc => setUserLocation({ lat: loc.lat, lng: loc.lng }))
      .catch(() => {});
  }, []);

  // Fetch saved car locations
  const { data: savedLocations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ['car-locations', user?.email],
    queryFn: () => user ? client.entities.CarLocation.filter({ user_email: user.email }, '-created_date', 5) : [],
    enabled: !!user,
  });

  const latestLocation = savedLocations[0];

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (data) => client.entities.CarLocation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['car-locations']);
      toast.success('Car location saved!');
      setShowSaveForm(false);
      setNotes('');
      setLotName('');
    },
    onError: () => {
      toast.error('Failed to save location');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => client.entities.CarLocation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['car-locations']);
      toast.success('Location deleted');
    },
  });

  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      const location = await getDeviceLocation();
      setCurrentLocation({
        lat: location.lat,
        lng: location.lng,
      });
      setShowSaveForm(true);
    } catch (error) {
      toast.error('Could not get your location. Please enable location permissions.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleSave = () => {
    if (!currentLocation) return;
    
    saveMutation.mutate({
      user_email: user.email,
      latitude: currentLocation.lat,
      longitude: currentLocation.lng,
      lot_name: lotName || 'My Car',
      notes: notes,
      timestamp: new Date().toISOString(),
    });
  };

  const handleNavigation = async (lat, lng, name = 'Car Location') => {
    try {
      await openNavigation(lat, lng, name, userLocation);
    } catch (error) {
      toast.error('Could not open navigation');
    }
  };

  const handleAuthSuccess = (loggedInUser) => {
    setUser(loggedInUser);
  };

  if (loading) {
    return (
      <div className="gd-page flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="gd-page">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 pt-12 pb-6">
          <div className="flex items-center gap-3 mb-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/20"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">Find My Car</h1>
          </div>
        </div>
        
        <div className="px-4 py-8">
          <div className="bg-surface-container rounded-3xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Car className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Sign In Required</h2>
            <p className="text-slate-600 mb-6">Sign in to save and find your car location.</p>
            <Button 
              onClick={() => setShowAuthModal(true)}
              className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              Sign In
            </Button>
          </div>
        </div>
        
        <AuthModal 
          open={showAuthModal} 
          onOpenChange={setShowAuthModal}
          onSuccess={handleAuthSuccess}
          feature="car location"
        />
      </div>
    );
  }

  return (
    <div className="gd-page">
      {/* Header */}
      <div className="gd-header px-4 pt-12 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Find My Car</h1>
        </div>
        <p className="text-white/80 text-sm">Never forget where you parked again</p>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Current Saved Location */}
        {latestLocation && !showSaveForm && (
          <div className="bg-surface-container rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Car className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{latestLocation.lot_name || 'My Car'}</h3>
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Saved {new Date(latestLocation.timestamp || latestLocation.created_date).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:bg-red-50"
                  onClick={() => deleteMutation.mutate(latestLocation.id)}
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
            </div>
            
            {latestLocation.notes && (
              <div className="px-4 py-3 bg-slate-50">
                <p className="text-sm text-slate-600">{latestLocation.notes}</p>
              </div>
            )}
            
            <div className="p-4">
              <Button
                onClick={() => handleNavigation(latestLocation.latitude, latestLocation.longitude, latestLocation.lot_name || 'My Car')}
                className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                <Navigation className="w-5 h-5 mr-2" />
                Navigate to Car
              </Button>
            </div>
          </div>
        )}

        {/* Save New Location Form */}
        {showSaveForm && currentLocation && (
          <div className="bg-surface-container rounded-2xl shadow-sm p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Save Car Location</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSaveForm(false)}
              >
                Cancel
              </Button>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <div className="flex items-center gap-2 text-green-700">
                <Check className="w-5 h-5" />
                <span className="font-medium">Location captured!</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
              </p>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-700">Lot/Area Name</label>
                <Input
                  placeholder="e.g., Lot 10, Blue Garage"
                  value={lotName}
                  onChange={(e) => setLotName(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700">Notes (optional)</label>
                <Textarea
                  placeholder="e.g., Near the big oak tree, Row 5"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
            
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Save Location
                </>
              )}
            </Button>
          </div>
        )}

        {/* Save New Button */}
        {!showSaveForm && (
          <Button
            onClick={getCurrentLocation}
            disabled={isGettingLocation}
            className="w-full h-14 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 rounded-2xl"
          >
            {isGettingLocation ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Plus className="w-5 h-5 mr-2" />
            )}
            {latestLocation ? 'Save New Location' : 'Save Car Location'}
          </Button>
        )}

        {/* History */}
        {savedLocations.length > 1 && (
          <div className="bg-surface-container rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Previous Locations</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {savedLocations.slice(1).map((location) => (
                <div key={location.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ParkingCircle className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="font-medium text-slate-900">{location.lot_name || 'Saved Location'}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(location.timestamp || location.created_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleNavigation(location.latitude, location.longitude, location.lot_name || 'Saved Location')}
                  >
                    <Navigation className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!latestLocation && !showSaveForm && !locationsLoading && (
          <div className="text-center py-12 bg-surface-container rounded-2xl">
            <Car className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="font-bold text-slate-900 mb-2">No saved locations</h3>
            <p className="text-slate-500 text-sm">Tap the button above to save your car's location</p>
          </div>
        )}
      </div>
    </div>
  );
}
