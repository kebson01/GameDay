import React from 'react';
import { TrendingUp, TrendingDown, Award, Target, Activity, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AdvancedStats({ stats, isLoading }) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-slate-100 rounded-xl h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const { current_season, rankings, trends, advanced_metrics, key_players } = stats;

  return (
    <div className="space-y-4">
      {/* Current Season Overview */}
      {current_season && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Award className="w-5 h-5 text-orange-500" />
            Current Season
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-sm text-slate-600 mb-1">Record</p>
              <p className="text-2xl font-bold text-slate-900">
                {current_season.wins}-{current_season.losses}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {current_season.conference_wins}-{current_season.conference_losses} in conf
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-sm text-slate-600 mb-1">PPG / Allowed</p>
              <p className="text-xl font-bold text-green-600">
                {current_season.points_per_game?.toFixed(1)}
              </p>
              <p className="text-xl font-bold text-red-600">
                {current_season.points_allowed_per_game?.toFixed(1)}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="text-center">
              <p className="text-xs text-slate-600">Total Yards</p>
              <p className="font-bold text-slate-900">{current_season.total_yards_per_game?.toFixed(0)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-600">Rush Yards</p>
              <p className="font-bold text-slate-900">{current_season.rushing_yards_per_game?.toFixed(0)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-600">Pass Yards</p>
              <p className="font-bold text-slate-900">{current_season.passing_yards_per_game?.toFixed(0)}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="text-center bg-blue-50 rounded-lg py-2">
              <p className="text-xs text-blue-600">3rd Down %</p>
              <p className="font-bold text-blue-900">{current_season.third_down_pct?.toFixed(0)}%</p>
            </div>
            <div className="text-center bg-green-50 rounded-lg py-2">
              <p className="text-xs text-green-600">Red Zone %</p>
              <p className="font-bold text-green-900">{current_season.red_zone_pct?.toFixed(0)}%</p>
            </div>
            <div className="text-center bg-purple-50 rounded-lg py-2">
              <p className="text-xs text-purple-600">TO Margin</p>
              <p className="font-bold text-purple-900">
                {current_season.turnover_margin > 0 ? '+' : ''}{current_season.turnover_margin}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Rankings */}
      {rankings && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Target className="w-5 h-5 text-orange-500" />
            Rankings
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {rankings.national_rank && rankings.national_rank <= 25 && (
              <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl p-3 text-white">
                <p className="text-xs opacity-90 mb-1">National Rank</p>
                <p className="text-3xl font-bold">#{rankings.national_rank}</p>
              </div>
            )}
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-600 mb-1">Conference</p>
              <p className="text-lg font-bold text-slate-900">{rankings.conference_standing}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3">
              <p className="text-xs text-green-600 mb-1">Offense Rank</p>
              <p className="text-xl font-bold text-green-900">#{rankings.offense_rank}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3">
              <p className="text-xs text-red-600 mb-1">Defense Rank</p>
              <p className="text-xl font-bold text-red-900">#{rankings.defense_rank}</p>
            </div>
          </div>
        </div>
      )}

      {/* Trends */}
      {trends && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Activity className="w-5 h-5 text-orange-500" />
            Performance Trends
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-600">Current Streak</span>
              <Badge variant="outline">{trends.current_streak}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-600">Home Record</span>
              <span className="font-semibold text-slate-900">{trends.home_record}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-600">Away Record</span>
              <span className="font-semibold text-slate-900">{trends.away_record}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-600">vs Ranked</span>
              <span className="font-semibold text-slate-900">{trends.vs_ranked}</span>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Metrics */}
      {advanced_metrics && (
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-4 text-white shadow-sm">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Advanced Metrics
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/20 rounded-xl p-3 backdrop-blur">
              <p className="text-xs opacity-90 mb-1">Offensive EPA</p>
              <p className="text-xl font-bold flex items-center gap-1">
                {advanced_metrics.offensive_epa > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {advanced_metrics.offensive_epa?.toFixed(2)}
              </p>
            </div>
            <div className="bg-white/20 rounded-xl p-3 backdrop-blur">
              <p className="text-xs opacity-90 mb-1">Defensive EPA</p>
              <p className="text-xl font-bold flex items-center gap-1">
                {advanced_metrics.defensive_epa < 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {advanced_metrics.defensive_epa?.toFixed(2)}
              </p>
            </div>
            <div className="bg-white/20 rounded-xl p-3 backdrop-blur">
              <p className="text-xs opacity-90 mb-1">Success Rate (O)</p>
              <p className="text-lg font-bold">{(advanced_metrics.success_rate_offense * 100)?.toFixed(1)}%</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3 backdrop-blur">
              <p className="text-xs opacity-90 mb-1">Success Rate (D)</p>
              <p className="text-lg font-bold">{(advanced_metrics.success_rate_defense * 100)?.toFixed(1)}%</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3 backdrop-blur">
              <p className="text-xs opacity-90 mb-1">Explosive Plays</p>
              <p className="text-lg font-bold">{(advanced_metrics.explosive_play_rate * 100)?.toFixed(1)}%</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3 backdrop-blur">
              <p className="text-xs opacity-90 mb-1">Stuff Rate</p>
              <p className="text-lg font-bold">{(advanced_metrics.stuff_rate * 100)?.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Key Players */}
      {key_players && key_players.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-3">Key Players</h3>
          <div className="space-y-3">
            {key_players.map((player, idx) => (
              <div key={idx} className="border-l-4 border-orange-500 pl-3 bg-slate-50 rounded-r-lg p-3">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="font-semibold text-slate-900">{player.name}</p>
                    <Badge variant="outline" className="text-xs mt-1">{player.position}</Badge>
                  </div>
                  <span className="text-2xl font-bold text-orange-600">{player.highlight_stat}</span>
                </div>
                <p className="text-sm text-slate-600 mt-2">{player.stats}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}