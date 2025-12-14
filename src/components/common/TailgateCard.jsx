import React from 'react';
import { format } from 'date-fns';
import { MapPin, Users, Clock, Lock, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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

export default function TailgateCard({ 
  tailgate, 
  onClick, 
  compact = false,
  className 
}) {
  if (compact) {
    return (
      <div 
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm cursor-pointer hover:shadow-md transition-all",
          className
        )}
      >
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-2xl">
          🎉
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate">{tailgate?.name || 'Tailgate'}</p>
          <p className="text-sm text-slate-500 truncate">{tailgate?.location?.lot_name || 'Location TBD'}</p>
        </div>
        <Badge className={typeColors[tailgate?.type] || typeColors.open}>
          {tailgate?.type || 'open'}
        </Badge>
      </div>
    );
  }
  
  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-lg transition-all group",
        className
      )}
    >
      {/* Header Image or Gradient */}
      <div className="h-32 bg-gradient-to-br from-green-400 via-emerald-500 to-teal-500 relative">
        {tailgate?.photo_url && (
          <img 
            src={tailgate.photo_url} 
            alt={tailgate.name} 
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
          <div>
            <Badge className={cn("mb-1", typeColors[tailgate?.type] || typeColors.open)}>
              {tailgate?.type || 'open'}
            </Badge>
            <h3 className="text-white font-bold text-lg">{tailgate?.name || 'Tailgate Party'}</h3>
          </div>
          {!tailgate?.is_public && (
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
              <Lock className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {tailgate?.start_time || 'TBD'} - {tailgate?.end_time || 'TBD'}
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {tailgate?.rsvp_count || 0}{tailgate?.capacity ? `/${tailgate.capacity}` : ''}
          </div>
        </div>
        
        <div className="flex items-center gap-1 text-sm text-slate-600 mt-2">
          <MapPin className="w-4 h-4 text-orange-500" />
          <span className="truncate">{tailgate?.location?.lot_name || tailgate?.location?.description || 'Location TBD'}</span>
        </div>
        
        {/* Amenities */}
        {tailgate?.amenities?.length > 0 && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
            {tailgate.amenities.slice(0, 5).map((amenity, idx) => (
              <span key={idx} className="text-lg" title={amenity}>
                {amenityEmojis[amenity] || '✨'}
              </span>
            ))}
            {tailgate.amenities.length > 5 && (
              <span className="text-sm text-slate-500">+{tailgate.amenities.length - 5}</span>
            )}
          </div>
        )}
        
        {/* Host */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
          <p className="text-sm text-slate-500">
            Hosted by <span className="font-medium text-slate-700">{tailgate?.host_name || 'Anonymous'}</span>
          </p>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-orange-500 transition-colors" />
        </div>
      </div>
    </div>
  );
}