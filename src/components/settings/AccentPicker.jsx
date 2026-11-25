import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Paintbrush, Shield } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import { NEUTRAL, ORANGE, teamAccentColors, useAccent } from '@/lib/accent';
import { resolveTeam } from '@/lib/teamData';
import { teamLogoUrl } from '@/lib/sportsApi';

/** Two-tone dot showing an accent's primary + secondary color */
function Swatch({ primary, secondary, className }) {
  return (
    <span
      aria-hidden="true"
      className={cn('block h-8 w-8 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/15', className)}
      style={{ background: `linear-gradient(135deg, ${primary} 0 55%, ${secondary || primary} 55% 100%)` }}
    />
  );
}

/**
 * "App color" picker for Settings: GameDay Orange, Neutral, or a followed team's colors.
 * `teams` is the list of followed team names.
 */
export default function AccentPicker({ teams = [] }) {
  const navigate = useNavigate();
  const { accent, setAccent } = useAccent();
  const [resolved, setResolved] = useState(null); // [{ name, id, short, logo, primary, secondary }]
  const [showTeams, setShowTeams] = useState(accent.mode === 'team');
  const teamsKey = teams.join('|');

  useEffect(() => {
    let alive = true;
    if (!teams.length) { setResolved([]); return undefined; }
    setResolved(null);
    Promise.all(teams.map(name => resolveTeam(name).catch(() => null))).then(list => {
      if (!alive) return;
      setResolved(list.map((t, i) => {
        const name = teams[i];
        const colors = t?.color ? teamAccentColors(t.color, t.alt_color) : null;
        return colors && {
          name,
          id: t.id,
          short: t.short || t.location || name,
          logo: t.logo || teamLogoUrl(t.id),
          ...colors,
        };
      }).filter(Boolean));
    });
    return () => { alive = false; };
  }, [teamsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickTeam = (t) => setAccent({ mode: 'team', team: t.name, primary: t.primary, secondary: t.secondary });

  const chooseTeamMode = () => setShowTeams(true);

  // Switching to "Team" starts with the first followed team (once its colors load)
  useEffect(() => {
    if (showTeams && accent.mode !== 'team' && resolved?.length) pickTeam(resolved[0]);
  }, [showTeams, resolved]); // eslint-disable-line react-hooks/exhaustive-deps

  const mode = showTeams && accent.mode !== 'team' && !resolved?.length ? 'team' : accent.mode;
  const teamSwatch = accent.mode === 'team'
    ? { primary: accent.primary, secondary: accent.secondary }
    : resolved?.[0] || null;

  const options = [
    { value: 'orange', label: 'GameDay', sub: 'Orange', swatch: ORANGE, onClick: () => { setShowTeams(false); setAccent({ mode: 'orange' }); } },
    { value: 'neutral', label: 'Neutral', sub: 'Steel blue', swatch: NEUTRAL, onClick: () => { setShowTeams(false); setAccent({ mode: 'neutral' }); } },
    { value: 'team', label: 'Team', sub: accent.mode === 'team' ? (resolved?.find(t => t.name === accent.team)?.short || accent.team) : 'Your colors', swatch: teamSwatch, onClick: chooseTeamMode },
  ];

  return (
    <div className="mt-4 border-t border-outline-variant pt-4 dark:border-white/[0.06]">
      <h3 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide text-on-surface">
        <Paintbrush className="h-4 w-4 text-orange-600 dark:text-brand-soft" />App color
      </h3>
      <p className="mt-0.5 text-xs text-on-surface-variant">Buttons, highlights and links use this color</p>

      <div role="radiogroup" aria-label="App color" className="mt-3 grid grid-cols-3 gap-2">
        {options.map(o => {
          const selected = mode === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={o.onClick}
              className={cn(
                'relative flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-colors',
                selected
                  ? 'border-brand bg-brand/10 ring-1 ring-brand'
                  : 'border-outline-variant bg-surface-container hover:border-brand/50 dark:border-white/[0.08] dark:bg-surface'
              )}
            >
              {o.swatch
                ? <Swatch primary={o.swatch.primary} secondary={o.swatch.secondary} />
                : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant dark:bg-surface-container-highest">
                    <Shield className="h-4 w-4" />
                  </span>
                )}
              <span className="font-display text-sm font-bold uppercase leading-none tracking-wide text-on-surface">{o.label}</span>
              <span className="max-w-full truncate text-[11px] leading-none text-on-surface-variant">{o.sub}</span>
              {selected && (
                <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-white">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {mode === 'team' && (
        <div className="mt-3">
          {!teams.length ? (
            <div className="rounded-xl bg-surface-container-high p-3 text-sm text-on-surface-variant dark:bg-surface">
              <p>Follow a team to use its colors across the app.</p>
              <button
                type="button"
                onClick={() => navigate(createPageUrl('DiscoverTeams'))}
                className="gd-btn-primary mt-2 h-9 rounded-xl px-3.5 text-sm font-bold"
              >
                Discover Teams
              </button>
            </div>
          ) : resolved === null ? (
            <div className="gd-chip-row" aria-busy="true">
              {teams.map(n => <span key={n} className="h-8 w-28 shrink-0 animate-pulse rounded-full bg-surface-container-high dark:bg-surface-container-highest" />)}
            </div>
          ) : (
            <>
              <p className="mb-2 text-xs font-semibold text-on-surface-variant">Choose a team</p>
              <div className="flex flex-wrap gap-2">
                {resolved.map(t => {
                  const on = accent.mode === 'team' && accent.team === t.name;
                  return (
                    <button
                      key={t.name}
                      type="button"
                      aria-pressed={on}
                      onClick={() => pickTeam(t)}
                      className="gd-chip pl-1"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
                        <img src={t.logo} alt="" className="h-5 w-5 object-contain" loading="lazy" />
                      </span>
                      <span>{t.short}</span>
                      <Swatch primary={t.primary} secondary={t.secondary} className="h-3.5 w-3.5 ring-white/40" />
                    </button>
                  );
                })}
              </div>
              {resolved.length < teams.length && (
                <p className="mt-2 text-[11px] text-on-surface-variant">Some teams&apos; colors couldn&apos;t be loaded.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
