import React, { useState } from 'react';
import { cn } from '@/lib/utils';

/** ESPN team logo on a tile, falling back to the abbreviation when the image fails */
export default function TeamLogo({ src, abbr, className, imgClassName, tile = true }) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden',
        tile && 'rounded-xl bg-surface-container-high dark:bg-white/[0.06]',
        className
      )}
    >
      {src && !failed ? (
        <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className={cn('h-[78%] w-[78%] object-contain', imgClassName)} />
      ) : (
        <span className="font-display text-sm font-bold uppercase text-orange-600 dark:text-brand-soft">
          {(abbr || '?').slice(0, 4)}
        </span>
      )}
    </span>
  );
}
