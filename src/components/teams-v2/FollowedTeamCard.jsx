import React from 'react';
import { CalendarDays, X } from 'lucide-react';
import TeamLogo from './TeamLogo';

/** Compact card for a followed team in the "Roster Hub" row */
export default function FollowedTeamCard({ name, team, rank, record, conferenceRecord, conference, liveGame, onOpen, onSchedule, onRemove }) {
  const color = team?.color || '#f97316';
  return (
    <div className="gd-card relative flex w-44 shrink-0 snap-start flex-col overflow-hidden">
      <span className="h-1 w-full" style={{ background: color }} aria-hidden="true" />
      <div className="flex items-start justify-between p-3 pb-0">
        <TeamLogo src={team?.logo} abbr={team?.abbreviation || name.slice(0, 3)} className="h-12 w-12" />
        <div className="flex gap-0.5">
          <button
            type="button"
            onClick={onSchedule}
            aria-label={`${name} schedule`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-orange-600 dark:hover:text-brand-soft"
          >
            <CalendarDays className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Unfollow ${name}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <button type="button" onClick={onOpen} className="flex flex-1 flex-col p-3 pt-2 text-left" aria-label={`Open ${name}`}>
        <span className="flex items-center gap-1.5">
          {rank && <span className="rounded bg-brand/15 px-1 text-[11px] font-bold text-orange-600 dark:text-brand-soft">#{rank}</span>}
          {conference && <span className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">{conference}</span>}
        </span>
        <span className="mt-0.5 truncate font-display text-xl font-bold uppercase leading-tight text-on-surface">
          {team?.location || name}
        </span>
        <span className="text-xs tabular-nums text-on-surface-variant">
          {record || '—'}{conferenceRecord ? ` (${conferenceRecord})` : ''}
        </span>
        {liveGame && (
          <span className="mt-2 inline-flex w-fit items-center gap-1 rounded-full bg-red-600/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-600 dark:bg-red-500/20 dark:text-red-300">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            Live now
          </span>
        )}
      </button>
    </div>
  );
}
