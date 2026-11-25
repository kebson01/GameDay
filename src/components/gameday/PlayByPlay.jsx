import React, { useState } from 'react';
import { Activity, TrendingUp, AlertCircle, Target, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const PAGE = 50;

export default function PlayByPlay({ data, isLoading, homeTeam, awayTeam, homeLogo, awayLogo }) {
  const [visible, setVisible] = useState(PAGE);
  const [scoringOnly, setScoringOnly] = useState(false);
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="bg-surface-container rounded-xl p-4 animate-pulse shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-5 w-16 bg-slate-200 rounded" />
              <div className="h-5 w-20 bg-slate-200 rounded" />
            </div>
            <div className="h-4 bg-slate-200 rounded w-full mb-2" />
            <div className="h-4 bg-slate-200 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (!data?.plays || data.plays.length === 0) {
    return (
      <div className="text-center py-12 bg-surface-container rounded-2xl shadow-sm">
        <Activity className="w-16 h-16 text-slate-200 mx-auto mb-4" />
        <p className="text-slate-500 font-medium">No play-by-play available</p>
        <p className="text-slate-400 text-sm mt-1">Check back during the game for live updates</p>
      </div>
    );
  }

  const { plays: allPlays, current_drive, game_situation } = data;
  const filteredPlays = scoringOnly ? allPlays.filter(p => p.is_scoring) : allPlays;
  const plays = filteredPlays.slice(0, visible);

  // Helper to get team logo
  const getTeamLogo = (teamAbbrev) => {
    if (!teamAbbrev) return null;
    if (teamAbbrev === homeTeam || teamAbbrev === homeTeam?.toUpperCase()) return homeLogo;
    if (teamAbbrev === awayTeam || teamAbbrev === awayTeam?.toUpperCase()) return awayLogo;
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Current Game Situation */}
      {game_situation && (
        <div className="bg-gradient-to-r from-ink-800 to-ink-900 text-white rounded-2xl p-4 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="font-semibold text-sm uppercase tracking-wide">Live Situation</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">
                {game_situation.down ? `${game_situation.down} & ${game_situation.distance}` : 'Ball on'}
              </p>
              <p className="text-sm opacity-75">
                {game_situation.yard_line ? `${game_situation.yard_line} yard line` : ''}
              </p>
            </div>
            <div className="text-right flex items-center gap-2 justify-end">
              {getTeamLogo(game_situation.possession_team) && (
                <img 
                  src={getTeamLogo(game_situation.possession_team)} 
                  alt="" 
                  className="w-8 h-8 object-contain"
                />
              )}
              <div>
                <p className="text-sm opacity-75">Possession</p>
                <p className="font-bold">{game_situation.possession_team || 'Unknown'}</p>
              </div>
            </div>
          </div>
          {game_situation.is_red_zone && (
            <div className="mt-3 px-3 py-1.5 bg-red-500/20 rounded-lg inline-flex items-center gap-2">
              <Zap className="w-4 h-4 text-red-400" />
              <span className="text-sm font-medium text-red-300">Red Zone</span>
            </div>
          )}
        </div>
      )}

      {/* Current Drive */}
      {current_drive && (
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-900">Current Drive</span>
            </div>
            <div className="flex items-center gap-2">
              {getTeamLogo(current_drive.team) && (
                <img 
                  src={getTeamLogo(current_drive.team)} 
                  alt={current_drive.team}
                  className="w-6 h-6 object-contain"
                />
              )}
              <Badge className="bg-blue-600 text-white">{current_drive.team}</Badge>
            </div>
          </div>
          <p className="text-sm text-blue-700 mb-3">{current_drive.description || current_drive.possession_text}</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-surface-container rounded-xl p-2">
              <p className="text-xl font-bold text-blue-900">{current_drive.plays_count || 0}</p>
              <p className="text-xs text-blue-600">Plays</p>
            </div>
            <div className="bg-surface-container rounded-xl p-2">
              <p className="text-xl font-bold text-blue-900">{current_drive.yards || 0}</p>
              <p className="text-xs text-blue-600">Yards</p>
            </div>
            <div className="bg-surface-container rounded-xl p-2">
              <p className="text-sm font-bold text-blue-900">{current_drive.start_yard_line || '-'}</p>
              <p className="text-xs text-blue-600">Started</p>
            </div>
          </div>
        </div>
      )}

      {/* Play by Play Feed */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 px-1">
          <h3 className="font-bold text-on-surface flex items-center gap-2">
            <Activity className="w-5 h-5 text-orange-500" />
            {scoringOnly ? 'Scoring Plays' : 'All Plays'}
            <span className="text-sm font-normal text-slate-400">({filteredPlays.length})</span>
          </h3>
          <button
            type="button"
            className="gd-chip"
            aria-pressed={scoringOnly}
            onClick={() => { setScoringOnly(v => !v); setVisible(PAGE); }}
          >
            Scoring only
          </button>
        </div>
        {scoringOnly && filteredPlays.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">No scoring plays yet.</p>
        )}
        
        {plays.map((play, idx) => (
          <div
            key={play.id || idx}
            className={`rounded-xl p-4 border-l-4 shadow-sm transition-all ${
              play.is_scoring 
                ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-500' 
                : play.is_turnover 
                ? 'bg-gradient-to-r from-red-50 to-red-100 border-red-500'
                : play.is_key_play
                ? 'bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-500'
                : 'bg-surface-container border-slate-200 hover:border-slate-300'
            }`}
          >
            {/* Play Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs font-semibold bg-slate-100">
                  Q{play.quarter} {play.time}
                </Badge>
                {play.down && play.distance && (
                  <Badge variant="outline" className="text-xs">
                    {play.down}&{play.distance}
                  </Badge>
                )}
                {play.yard_line && (
                  <span className="text-xs text-slate-500 font-medium">{play.yard_line}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {play.is_scoring && (
                  <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                    SCORE!
                  </span>
                )}
                {play.is_turnover && (
                  <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                    TURNOVER
                  </span>
                )}
                {play.is_key_play && !play.is_scoring && !play.is_turnover && (
                  <TrendingUp className="w-4 h-4 text-orange-500" />
                )}
              </div>
            </div>
            
            {/* Play Description */}
            <p className="text-sm text-slate-800 mb-2 leading-relaxed">
              {play.description}
            </p>
            
            {/* Play Result */}
            <div className="flex items-center justify-between">
              {play.result && (
                <span className={`text-sm font-semibold ${
                  play.yards > 0 ? 'text-green-600' : play.yards < 0 ? 'text-red-600' : 'text-slate-600'
                }`}>
                  {play.result}
                </span>
              )}
              {play.team && (
                <div className="flex items-center gap-1.5">
                  {getTeamLogo(play.team) && (
                    <img 
                      src={getTeamLogo(play.team)} 
                      alt={play.team}
                      className="w-5 h-5 object-contain"
                    />
                  )}
                  <Badge variant="outline" className="text-xs">
                    {play.team}
                  </Badge>
                </div>
              )}
              {play.play_type && !play.team && (
                <span className="text-xs text-slate-400">{play.play_type}</span>
              )}
            </div>
          </div>
        ))}
        
        {filteredPlays.length > plays.length && (
          <button
            type="button"
            onClick={() => setVisible(filteredPlays.length)}
            className="gd-card w-full py-3 text-center text-sm font-semibold text-orange-600 dark:text-brand-soft"
          >
            Show all {filteredPlays.length} plays (back to kickoff)
          </button>
        )}
      </div>
    </div>
  );
}
