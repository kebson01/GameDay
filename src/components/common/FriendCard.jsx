import React from 'react';
import { Navigation, Battery, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const statusColors = {
  active: 'bg-green-500',
  idle: 'bg-yellow-500',
  offline: 'bg-slate-400',
  sos: 'bg-red-500 animate-pulse',
};

export default function FriendCard({ 
  friend, 
  distance, 
  onNavigate, 
  compact = false,
  className 
}) {
  const initials = friend?.email?.slice(0, 2).toUpperCase() || '??';
  const status = friend?.status || 'active';
  const lastSeen = friend?.last_updated ? formatDistanceToNow(new Date(friend.last_updated), { addSuffix: true }) : 'Unknown';
  
  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm",
        status === 'sos' && "border-red-500 bg-red-50",
        className
      )}>
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
            {initials}
          </div>
          <div className={cn(
            "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white",
            statusColors[status]
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate">{friend?.email?.split('@')[0] || 'Friend'}</p>
          {distance && (
            <p className="text-sm text-slate-500">{distance} away</p>
          )}
        </div>
        {status === 'sos' && (
          <Badge className="bg-red-500 text-white">SOS</Badge>
        )}
      </div>
    );
  }
  
  return (
    <div className={cn(
      "bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden",
      status === 'sos' && "border-red-500 ring-2 ring-red-200",
      className
    )}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-lg">
              {initials}
            </div>
            <div className={cn(
              "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white",
              statusColors[status]
            )} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-bold text-slate-900">{friend?.email?.split('@')[0] || 'Friend'}</p>
              {status === 'sos' && (
                <Badge className="bg-red-500 text-white flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  SOS
                </Badge>
              )}
            </div>
            
            {friend?.status_message && (
              <p className="text-sm text-slate-600 mt-0.5">"{friend.status_message}"</p>
            )}
            
            <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {lastSeen}
              </div>
              {friend?.battery_level && (
                <div className="flex items-center gap-1">
                  <Battery className="w-3.5 h-3.5" />
                  {friend.battery_level}%
                </div>
              )}
            </div>
          </div>
        </div>
        
        {distance && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Distance</p>
              <p className="text-lg font-bold text-slate-900">{distance}</p>
            </div>
            <Button 
              onClick={onNavigate}
              className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
            >
              <Navigation className="w-4 h-4" />
              Navigate
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}