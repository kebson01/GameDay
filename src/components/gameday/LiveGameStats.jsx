import React from 'react';
import { BarChart3, Users, Trophy, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function LiveGameStats({ data, homeTeam, awayTeam, homeLogo, awayLogo, isLoading }) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-surface-container rounded-xl p-4 animate-pulse shadow-sm">
            <div className="h-6 bg-slate-200 rounded w-1/3 mb-4" />
            <div className="space-y-3">
              <div className="h-4 bg-slate-200 rounded w-full" />
              <div className="h-4 bg-slate-200 rounded w-full" />
              <div className="h-4 bg-slate-200 rounded w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data || (!data.comparison?.length && !data.home?.players && !data.away?.players)) {
    return (
      <div className="text-center py-12 bg-surface-container rounded-2xl shadow-sm">
        <BarChart3 className="w-16 h-16 text-slate-200 mx-auto mb-4" />
        <p className="text-slate-500 font-medium">No stats available yet</p>
        <p className="text-slate-400 text-sm mt-1">Stats will appear once the game starts</p>
      </div>
    );
  }

  const { home, away, comparison } = data;

  // Stat comparison bar component
  const StatComparison = ({ label, homeValue, awayValue, homeRaw, awayRaw }) => {
    const homeNum = homeRaw ?? (typeof homeValue === 'number' ? homeValue : parseFloat(homeValue) || 0);
    const awayNum = awayRaw ?? (typeof awayValue === 'number' ? awayValue : parseFloat(awayValue) || 0);
    const total = homeNum + awayNum;
    const homePercent = total > 0 ? (homeNum / total) * 100 : 50;

    return (
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1.5">
          <span className="font-bold text-slate-900 min-w-[60px]">{homeValue}</span>
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</span>
          <span className="font-bold text-slate-900 min-w-[60px] text-right">{awayValue}</span>
        </div>
        <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
          <div 
            className="bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-500"
            style={{ width: `${homePercent}%` }}
          />
          <div 
            className="bg-gradient-to-r from-slate-400 to-slate-500 transition-all duration-500"
            style={{ width: `${100 - homePercent}%` }}
          />
        </div>
      </div>
    );
  };

  // Player stat card
  const PlayerCard = ({ player, category }) => (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ink-600 to-ink-800 flex items-center justify-center text-white text-xs font-bold">
        {player.position || '#'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 text-sm truncate">{player.name}</p>
        <p className="text-xs text-slate-500">{player.stats}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Team Headers */}
      <div className="bg-surface-container rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {homeLogo ? (
              <img src={homeLogo} alt={homeTeam} className="w-10 h-10 object-contain" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-600 flex items-center justify-center text-white font-bold text-sm">
                {home?.abbreviation?.substring(0, 2) || 'H'}
              </div>
            )}
            <span className="font-bold text-slate-900">{home?.abbreviation || homeTeam}</span>
          </div>
          <span className="text-sm text-slate-500 font-medium">VS</span>
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-900">{away?.abbreviation || awayTeam}</span>
            {awayLogo ? (
              <img src={awayLogo} alt={awayTeam} className="w-10 h-10 object-contain" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                {away?.abbreviation?.substring(0, 2) || 'A'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Team Stats Comparison */}
      {comparison && comparison.length > 0 && (
        <div className="bg-surface-container rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-orange-500" />
            Team Statistics
          </h3>

          {comparison.map((stat, idx) => (
            <StatComparison
              key={idx}
              label={stat.label}
              homeValue={stat.home_value}
              awayValue={stat.away_value}
              homeRaw={stat.home_raw}
              awayRaw={stat.away_raw}
            />
          ))}
        </div>
      )}

      {/* Player Stats - Home Team */}
      {home?.players && Object.keys(home.players).length > 0 && (
        <div className="bg-surface-container rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            {homeLogo && <img src={homeLogo} alt="" className="w-6 h-6" />}
            <h3 className="font-bold text-slate-900">{home.team || homeTeam} Players</h3>
          </div>
          
          {home.players.passing?.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-orange-600 mb-2 uppercase tracking-wide">Passing</p>
              {home.players.passing.slice(0, 2).map((player, idx) => (
                <PlayerCard key={idx} player={player} category="passing" />
              ))}
            </div>
          )}

          {home.players.rushing?.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-green-600 mb-2 uppercase tracking-wide">Rushing</p>
              {home.players.rushing.slice(0, 2).map((player, idx) => (
                <PlayerCard key={idx} player={player} category="rushing" />
              ))}
            </div>
          )}

          {home.players.receiving?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-blue-600 mb-2 uppercase tracking-wide">Receiving</p>
              {home.players.receiving.slice(0, 3).map((player, idx) => (
                <PlayerCard key={idx} player={player} category="receiving" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Player Stats - Away Team */}
      {away?.players && Object.keys(away.players).length > 0 && (
        <div className="bg-surface-container rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            {awayLogo && <img src={awayLogo} alt="" className="w-6 h-6" />}
            <h3 className="font-bold text-slate-900">{away.team || awayTeam} Players</h3>
          </div>
          
          {away.players.passing?.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-orange-600 mb-2 uppercase tracking-wide">Passing</p>
              {away.players.passing.slice(0, 2).map((player, idx) => (
                <PlayerCard key={idx} player={player} category="passing" />
              ))}
            </div>
          )}

          {away.players.rushing?.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-green-600 mb-2 uppercase tracking-wide">Rushing</p>
              {away.players.rushing.slice(0, 2).map((player, idx) => (
                <PlayerCard key={idx} player={player} category="rushing" />
              ))}
            </div>
          )}

          {away.players.receiving?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-blue-600 mb-2 uppercase tracking-wide">Receiving</p>
              {away.players.receiving.slice(0, 3).map((player, idx) => (
                <PlayerCard key={idx} player={player} category="receiving" />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
