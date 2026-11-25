import React from 'react';
import { Play } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { cn } from '@/lib/utils';

function timeAgo(date) {
  if (!date) return null;
  try {
    return `${formatDistanceToNowStrict(new Date(date))} ago`;
  } catch {
    return null;
  }
}

function Thumb({ video, className, large = false }) {
  return (
    <div className={cn('relative overflow-hidden bg-ink-800', className)}>
      {video.thumbnail ? (
        <img src={video.thumbnail} alt="" loading="lazy" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-ink-700 to-ink-900" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      <span
        className={cn(
          'absolute inset-0 m-auto flex items-center justify-center rounded-full bg-brand text-white shadow-[0_0_18px_-2px_rgb(var(--gd-brand)/0.7)]',
          large ? 'w-14 h-14' : 'w-9 h-9'
        )}
      >
        <Play className={cn('fill-white', large ? 'w-6 h-6 ml-1' : 'w-4 h-4 ml-0.5')} />
      </span>
      {video.duration_label && (
        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-white tabular-nums">
          {video.duration_label}
        </span>
      )}
      {video.premium && (
        <span className="absolute top-1.5 left-1.5 rounded bg-yellow-400 px-1.5 py-0.5 text-[10px] font-bold text-ink-900">
          ESPN+
        </span>
      )}
    </div>
  );
}

/**
 * A tappable video story card.
 * layout="row": thumbnail left, text right (lists)
 * layout="tile": full-width 16:9 thumbnail on top (featured clip)
 */
export default function VideoCard({ video, onOpen, layout = 'row', className }) {
  const ago = timeAgo(video.published);

  if (layout === 'tile') {
    return (
      <button
        type="button"
        onClick={() => onOpen(video)}
        className={cn('block w-full text-left gd-card overflow-hidden', className)}
        aria-label={`Video: ${video.headline}`}
      >
        <Thumb video={video} large className="aspect-video" />
        <div className="p-3">
          <h3 className="font-bold text-slate-900 leading-snug line-clamp-2">{video.headline}</h3>
          <p className="mt-1 text-xs text-slate-500">
            {[video.source, ago].filter(Boolean).join(' • ')}
          </p>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(video)}
      className={cn('flex w-full gap-3 text-left gd-card p-2 items-center', className)}
      aria-label={`Video: ${video.headline}`}
    >
      <Thumb video={video} className="w-32 shrink-0 aspect-video rounded-xl" />
      <div className="min-w-0 flex-1 pr-1">
        <h3 className="text-sm font-semibold font-sans tracking-normal text-slate-900 leading-snug line-clamp-2">
          {video.headline}
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          {[video.source, ago].filter(Boolean).join(' • ')}
        </p>
      </div>
    </button>
  );
}
