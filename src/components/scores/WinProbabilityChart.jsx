import React, { useId } from 'react';

/**
 * Win probability over the game (ESPN model, one point per play).
 * Above the midline = home team favored, below = away team favored.
 */
export default function WinProbabilityChart({ points = [], home, away, live = false }) {
  const gradId = useId().replace(/:/g, '');
  if (points.length < 2) return null;
  const W = 320;
  const H = 120;
  const x = (i) => (i / (points.length - 1)) * W;
  const y = (pct) => H - (pct / 100) * H;
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p).toFixed(1)}`).join(' ');
  const area = `${line} L${W},${H / 2} L0,${H / 2} Z`;
  const last = points[points.length - 1];
  const homeColor = home?.color || '#f97316';
  const awayColor = away?.color || '#64748b';

  return (
    <div className="gd-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold uppercase text-on-surface">Win probability</h3>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">ESPN model{live ? ' · live' : ''}</span>
      </div>
      <div className="mb-2 flex items-center justify-between text-sm font-bold">
        <span className="flex items-center gap-1.5 text-on-surface">
          {away?.logo && <img src={away.logo} alt="" className="h-5 w-5 object-contain" />}
          {away?.abbreviation} <span className="tabular-nums">{Math.round((100 - last) * 10) / 10}%</span>
        </span>
        <span className="flex items-center gap-1.5 text-on-surface">
          <span className="tabular-nums">{last}%</span> {home?.abbreviation}
          {home?.logo && <img src={home.logo} alt="" className="h-5 w-5 object-contain" />}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-32 w-full" preserveAspectRatio="none" role="img"
        aria-label={`${home?.abbreviation} win probability ${last}%`}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={homeColor} stopOpacity="0.45" />
            <stop offset="50%" stopColor={homeColor} stopOpacity="0.02" />
            <stop offset="50%" stopColor={awayColor} stopOpacity="0.02" />
            <stop offset="100%" stopColor={awayColor} stopOpacity="0.45" />
          </linearGradient>
        </defs>
        <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="currentColor" className="text-outline-variant" strokeDasharray="4 4" />
        {[1, 2, 3].map(q => (
          <line key={q} x1={(W / 4) * q} y1="0" x2={(W / 4) * q} y2={H} stroke="currentColor" className="text-outline-variant/40" />
        ))}
        <path d={area} fill={`url(#${gradId})`} />
        <path d={line} fill="none" stroke={last >= 50 ? homeColor : awayColor} strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] font-semibold uppercase text-on-surface-variant">
        <span>Kickoff</span><span>Q2</span><span>Half</span><span>Q4</span><span>{live ? 'Now' : 'Final'}</span>
      </div>
    </div>
  );
}
