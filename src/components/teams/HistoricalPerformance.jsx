import React from 'react';
import { Calendar, Trophy } from 'lucide-react';

export default function HistoricalPerformance({ seasons, isLoading }) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-slate-100 rounded-xl h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!seasons || seasons.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-slate-900 flex items-center gap-2 px-4">
        <Calendar className="w-5 h-5 text-orange-500" />
        Historical Performance
      </h3>
      
      {seasons.map((season, idx) => (
        <div key={idx} className="bg-surface-container rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-lg font-bold text-slate-900">{season.year} Season</h4>
              <p className="text-sm text-slate-600">
                Overall: <span className="font-semibold text-slate-900">{season.record}</span>
                {season.conference_record && (
                  <span className="ml-2">
                    • Conference: <span className="font-semibold">{season.conference_record}</span>
                  </span>
                )}
              </p>
            </div>
            {season.bowl_game && (
              <Trophy className="w-6 h-6 text-orange-500" />
            )}
          </div>
          
          {season.bowl_game && (
            <div className="bg-orange-50 rounded-lg p-3 mb-3">
              <p className="text-sm font-semibold text-orange-900">{season.bowl_game}</p>
            </div>
          )}
          
          {season.notable_wins && season.notable_wins.length > 0 && (
            <div>
              <p className="text-xs text-slate-600 mb-2">Notable Wins:</p>
              <div className="space-y-1">
                {season.notable_wins.map((win, i) => (
                  <div key={i} className="text-sm text-slate-700 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    {win}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}