import React from 'react';
import { Swords, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function HeadToHeadDisplay({ data, team1, team2, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-surface-container rounded-2xl p-4 shadow-sm">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-slate-200 rounded w-1/2" />
          <div className="h-20 bg-slate-200 rounded" />
          <div className="h-40 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { series_record, recent_meetings, current_streak, largest_victory, rivalry_info } = data;

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl p-4 text-white shadow-lg">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <Swords className="w-5 h-5" />
          Head-to-Head Record
        </h3>
        
        {series_record && (
          <div className="bg-white/20 backdrop-blur rounded-xl p-4">
            <div className="grid grid-cols-3 gap-4 text-center mb-3">
              <div>
                <p className="text-3xl font-bold">{series_record.team1_wins}</p>
                <p className="text-xs opacity-90">{team1}</p>
              </div>
              <div>
                <p className="text-sm opacity-75 mb-1">of {series_record.total_games}</p>
                <p className="text-xs">
                  {series_record.ties > 0 && `${series_record.ties} Ties`}
                </p>
              </div>
              <div>
                <p className="text-3xl font-bold">{series_record.team2_wins}</p>
                <p className="text-xs opacity-90">{team2}</p>
              </div>
            </div>
            <p className="text-center text-sm">
              <strong>{series_record.leader}</strong> leads the series
            </p>
          </div>
        )}

        {current_streak && (
          <div className="mt-3 bg-white/10 rounded-lg p-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">
              <strong>{current_streak.team}</strong> on {current_streak.games}-game win streak
            </span>
          </div>
        )}
      </div>

      {rivalry_info && (
        <div className="bg-orange-50 rounded-2xl p-4">
          <p className="text-sm text-slate-700">{rivalry_info}</p>
        </div>
      )}

      {recent_meetings && recent_meetings.length > 0 && (
        <div className="bg-surface-container rounded-2xl p-4 shadow-sm">
          <h4 className="font-bold text-slate-900 mb-3">Recent Meetings</h4>
          <div className="space-y-3">
            {recent_meetings.map((meeting, idx) => (
              <div key={idx} className="border-l-4 border-orange-500 pl-3 bg-slate-50 rounded-r-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-600">{meeting.date}</span>
                  <Badge variant="outline">{meeting.location}</Badge>
                </div>
                <p className="font-semibold text-slate-900">{meeting.winner} wins</p>
                <p className="text-lg font-bold text-orange-600">{meeting.score}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {largest_victory && (
        <div className="bg-ink-900 text-white rounded-2xl p-4">
          <h4 className="font-bold mb-2">Largest Victory</h4>
          <p className="text-2xl font-bold text-orange-400">{largest_victory.team}</p>
          <p className="text-lg">{largest_victory.score}</p>
          <p className="text-sm opacity-75 mt-1">in {largest_victory.year}</p>
        </div>
      )}
    </div>
  );
}