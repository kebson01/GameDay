import React from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, Wind, Thermometer, Droplets } from 'lucide-react';
import { cn } from '@/lib/utils';

const weatherIcons = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  snowy: CloudSnow,
  windy: Wind,
};

export default function WeatherWidget({ 
  temp = 72, 
  condition = 'sunny', 
  humidity = 45,
  wind = 8,
  className,
  compact = false 
}) {
  const Icon = weatherIcons[condition] || Sun;
  
  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 text-white/90", className)}>
        <Icon className="w-5 h-5" />
        <span className="font-semibold">{temp}°F</span>
      </div>
    );
  }
  
  return (
    <div className={cn(
      "bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl p-4 text-white",
      className
    )}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/70 text-sm font-medium">Game Day Weather</p>
          <p className="text-4xl font-bold mt-1">{temp}°F</p>
          <p className="text-white/90 capitalize mt-1">{condition}</p>
        </div>
        <Icon className="w-16 h-16 text-white/90" />
      </div>
      
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/20">
        <div className="flex items-center gap-1.5">
          <Droplets className="w-4 h-4 text-white/70" />
          <span className="text-sm">{humidity}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Wind className="w-4 h-4 text-white/70" />
          <span className="text-sm">{wind} mph</span>
        </div>
      </div>
    </div>
  );
}