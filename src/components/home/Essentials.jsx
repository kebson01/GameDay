import React from 'react';
import { Car, Users, PartyPopper, Map, ChevronRight } from 'lucide-react';

/** 2x2 "Game day essentials" shortcuts with real status lines */
export default function Essentials({ carLabel, crewLabel, tailgateLabel, onOpen }) {
  const items = [
    { id: 'car', icon: Car, title: 'Find My Car', sub: carLabel || 'Save your spot', tag: carLabel ? 'Saved' : null },
    { id: 'friends', icon: Users, title: 'Find Friends', sub: crewLabel || 'Share location with your crew', tag: null },
    { id: 'tailgates', icon: PartyPopper, title: 'Tailgates', sub: tailgateLabel || 'Find or host a party', tag: null },
    { id: 'map', icon: Map, title: 'Campus Map', sub: 'Restrooms, food, gates', tag: null },
  ];
  return (
    <section aria-labelledby="essentials">
      <h2 id="essentials" className="mb-3 font-display text-lg font-bold uppercase tracking-wide text-on-surface">Game day essentials</h2>
      <div className="grid grid-cols-2 gap-3">
        {items.map(({ id, icon: Icon, title, sub, tag }) => (
          <button key={id} type="button" onClick={() => onOpen(id)} className="gd-card flex min-h-[112px] flex-col p-3.5 text-left">
            <div className="flex w-full items-start justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/15 text-orange-600 dark:text-brand-soft">
                <Icon className="h-5 w-5" />
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
