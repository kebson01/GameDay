import React from 'react';
import { cn } from '@/lib/utils';

/** Round fan avatar: photo when available, otherwise the first initial on an orange tile. */
export default function FeedAvatar({ src, name, size = 'md', className }) {
  const dims = size === 'sm' ? 'h-8 w-8 text-sm' : size === 'lg' ? 'h-12 w-12 text-xl' : 'h-11 w-11 text-lg';
  if (src) {
    return (
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        className={cn('shrink-0 rounded-full object-cover ring-2 ring-brand/40', dims, className)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-brand/15 font-display font-bold uppercase text-orange-600 ring-2 ring-brand/40 dark:text-brand-soft',
        dims,
        className
      )}
    >
      {name?.trim()?.charAt(0) || 'F'}
    </span>
  );
}
