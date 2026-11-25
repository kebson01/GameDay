import React from 'react';
import { ChevronRight } from 'lucide-react';
import { CarIcon, FriendsIcon, TailgateIcon, CampusMapIcon } from '@/components/icons/GameDayIcons';

/** 2x2 "Game day essentials" shortcuts with real status lines */
export default function Essentials({ carLabel, crewLabel, tailgateLabel, onOpen }) {
  const items = [
    { id: 'car', icon: CarIcon, tint: 'bg-sky-500/15', title: 'Find My Car', sub: carLabel || 'Save your spot', tag: carLabel ? 'Saved' : null },
    { id: 'friends', icon: FriendsIcon, tint: 'bg-emerald-500/15', title: 'Find Friends', sub: crewLabel || 'Share location with your crew', tag: null },
    { id: 'tailgates', icon: TailgateIcon, tint: 'bg-red-500/15', title: 'Tailgates', sub: tailgateLabel || 'Find or host a party', tag: null },
    { id: 'map', icon: CampusMapIcon, tint: 'bg-green-500/15', title: 'Campus Map', sub: 'Restrooms, food, gates', tag: null },
  ];
  return (
    <section aria-labelledby="essentials">
      <h2 id="essentials" className="mb-3 font-display text-lg font-bold uppercase tracking-wide text-on-surface">Game day essentials</h2>
      <div className="grid grid-cols-2 gap-3">
        {items.map(({ id, icon: Icon, tint, title, sub, tag }) => (
          <button key={id} type="button" onClick={() => onOpen(id)} className="gd-card flex min-h-[112px] flex-col p-3.5 text-left">
            <div className="flex w-full items-start justify-between">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-on-surface ${tint}`}>
                <Icon className="h-6 w-6" />
              </span>
              {tag ? <span className="gd-pill bg-emerald-600/15 text-emerald-700 dark:text-brand-win">{tag}</span> : <ChevronRight className="h-4 w-4 text-on-surface-variant" />}
            </div>
            <p className="mt-auto pt-2 font-display text-lg font-bold uppercase leading-tight text-on-surface">{title}</p>
            <p className="line-clamp-2 text-xs text-on-surface-variant">{sub}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
