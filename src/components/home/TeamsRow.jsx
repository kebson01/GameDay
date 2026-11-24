import React from 'react';
import { Radio, Pencil, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Row of followed teams at the top of Home. "All" shows every story;
 * tapping a team filters the feed and scores to that team.
 */
export default function TeamsRow({ teams = [], selectedId, onSelect, onEdit }) {
  const Tile = ({ active, label, onClick, children, ariaLabel }) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel || label}
      className="flex w-16 shrink-0 flex-col items-center gap-1.5 snap-start"
    >
      <span
        className={cn(
          'flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm transition-all',
          active ? 'ring-[3px] ring-brand ring-offset-2 ring-offset-transparent' : 'ring-1 ring-black/10'
        )}
      >
        {children}
      </span>
      <span className={cn('w-full truncate text-center text-[11px] font-semibold', active ? 'opacity-100' : 'opacity-80')}>
        {label}
      </span>
    </button>
  );

  return (
    <div className="-mx-4 flex snap-x items-start gap-3 overflow-x-auto px-4 pt-3 pb-1 [scrollbar-width:none]" role="toolbar" aria-label="Filter by team">
      <Tile active={!selectedId} label="All" onClick={() => onSelect(null)} ariaLabel="All stories">
        <Radio className="h-7 w-7 text-red-500" strokeWidth={2.5} />
      </Tile>

      {teams.map(team => (
        <Tile key={team.id} active={selectedId === team.id} label={team.short || team.name} onClick={() => onSelect(team.id)} ariaLabel={team.name}>
          {team.logo ? (
            <img src={team.logo} alt="" className="h-10 w-10 object-contain" loading="lazy" />
          ) : (
            <span className="font-display text-lg font-bold text-ink-900">{team.name?.slice(0, 2).toUpperCase()}</span>
          )}
        </Tile>
      ))}

      <span className="mx-1 mt-2 h-10 w-px shrink-0 bg-current opacity-25" aria-hidden="true" />

      <Tile label={teams.length ? 'Edit' : 'Follow'} onClick={onEdit} ariaLabel={teams.length ? 'Edit followed teams' : 'Follow teams'}>
        {teams.length ? <Pencil className="h-6 w-6 text-ink-900" /> : <Plus className="h-7 w-7 text-ink-900" />}
      </Tile>
    </div>
  );
}
