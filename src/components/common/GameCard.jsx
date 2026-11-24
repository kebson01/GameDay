import React from 'react';
import { format, parseISO } from 'date-fns';
import { MapPin, Tv, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function GameCard({ game, schoolLogo, schoolName, compact = false }) {
  const isLive = game?.status === 'live';
  const isFinal = game?.status === 'final';
  // Accept both the local "game" shape (date/time/opponent) and the ESPN
  // scoreboard shape from sportsApi.parseGames (full_date/game_time/home_team/away_team).
  const gameDate = game?.date || game?.full_date;
  const gameTime = game?.time || game?.game_time;
  const homeName = schoolName || game?.home_team;
  const homeLogo = schoolLogo || game?.home_logo;
  const awayName = game?.opponent || game?.away_team;
  const awayLogo = game?.opponent_logo || game?.away_logo;
  
  if (compact) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-surface-container rounded-lg flex items-center justify-center">
              <span className="text-2xl">🏈</span>
            </div>
            <div>
              <p className="font-semibold text-white text-sm">vs {awayName || 'TBD'}</p>
              <p className="text-white/70 text-xs">
                {gameDate ? format(parseISO(gameDate), 'MMM d') : 'Date TBD'} • {gameTime || 'TBD'}
              </p>
            </div>
          </div>
          {isLive && (
            <Badge className="bg-red-500 text-white animate-pulse">LIVE</Badge>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-surface-container rounded-2xl shadow-lg overflow-hidden border border-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-ink-900 to-ink-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isLive && (
              <Badge className="bg-red-500 text-white animate-pulse">● LIVE</Badge>
            )}
            {isFinal && (
              <Badge variant="secondary">FINAL</Badge>
            )}
            {!isLive && !isFinal && (
              <Badge variant="outline" className="text-white border-white/30">
                {gameDate ? format(parseISO(gameDate), 'EEE, MMM d') : 'Date TBD'}
              </Badge>
            )}
          </div>
          {game?.tv_network && (
            <div className="flex items-center gap-1 text-white/70 text-sm">
              <Tv className="w-4 h-4" />
              {game.tv_network}
            </div>
          )}
        </div>
      </div>
      
      {/* Teams */}
      <div className="p-5">
        <div className="flex items-center justify-between">
          {/* Home Team */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center">
              {homeLogo ? (
                <img src={homeLogo} alt={homeName} className="w-12 h-12 object-contain" />
              ) : (
                <span className="text-3xl">🏈</span>
              )}
            </div>
            <p className="font-bold text-slate-900 text-center">{homeName || 'Home'}</p>
            {(isLive || isFinal) && (
              <p className="gd-score text-4xl text-slate-900">{game?.home_score || 0}</p>
            )}
          </div>
          
          {/* VS / Score */}
          <div className="px-4">
            {isLive || isFinal ? (
              <div className="text-center">
                {isLive && game?.quarter && (
                  <p className="text-sm text-red-500 font-semibold">{game.quarter}</p>
                )}
              </div>
            ) : (
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-300">VS</p>
                <div className="flex items-center gap-1 text-slate-500 text-sm mt-2">
                  <Clock className="w-4 h-4" />
                  {gameTime || 'TBD'}
                </div>
              </div>
            )}
          </div>
          
          {/* Away Team */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center">
              {awayLogo ? (
                <img src={awayLogo} alt={awayName} className="w-12 h-12 object-contain" />
              ) : (
                <span className="text-3xl">🏈</span>
              )}
            </div>
            <p className="font-bold text-slate-900 text-center">{awayName || 'Away'}</p>
            {(isLive || isFinal) && (
              <p className="gd-score text-4xl text-slate-900">{game?.away_score || 0}</p>
            )}
          </div>
        </div>
        
        {/* Venue */}
        {game?.venue && (
          <div className="flex items-center justify-center gap-1 text-slate-500 text-sm mt-4 pt-4 border-t">
            <MapPin className="w-4 h-4" />
            {game.venue}
          </div>
        )}
      </div>
    </div>
  );
}