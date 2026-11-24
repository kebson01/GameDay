import React from 'react';
import { cn } from '@/lib/utils';

export default function QuickAction({ 
  icon: Icon, 
  label, 
  onClick, 
  color = 'orange',
  badge,
  className 
}) {
  const colorStyles = {
    orange: 'from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700',
    blue: 'from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700',
    green: 'from-green-400 to-green-600 hover:from-green-500 hover:to-green-700',
    red: 'from-red-400 to-red-600 hover:from-red-500 hover:to-red-700',
    purple: 'from-purple-400 to-purple-600 hover:from-purple-500 hover:to-purple-700',
    slate: 'from-ink-600 to-ink-800 hover:from-ink-700 hover:to-ink-900',
  };
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-2 p-4 rounded-2xl bg-gradient-to-br text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95",
        colorStyles[color],
        className
      )}
    >
      {badge && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs font-bold flex items-center justify-center">
          {badge}
        </span>
      )}
      <Icon className="w-7 h-7" />
      <span className="text-xs font-medium text-center leading-tight">{label}</span>
    </button>
  );
}