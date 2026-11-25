import React, { useState } from 'react';
import { Play, Newspaper } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Skeleton } from '@/components/common/LoadingSkeleton';
import VideoStorySheet from '@/components/video/VideoStorySheet';

const ago = (d) => {
  if (!d) return null;
  try {
    return `${formatDistanceToNowStrict(new Date(d))} ago`;
  } catch {
    return null;
  }
};

/**
 * "Insiders & Film" list of ESPN stories (fetchStories / toStory shape).
 * Tapping opens the shared in-app story sheet.
 */
export default function StoryList({ stories = [], isLoading, max = 6, emptyText = 'No recent stories from ESPN.' }) {
  const [selected, setSelected] = useState(null);

  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
      </div>
    );
  }
  if (!stories.length) {
    return (
      <div className="gd-card flex items-center gap-3 p-4 text-sm text-on-surface-variant">
        <Newspaper className="h-5 w-5 shrink-0" />
        {emptyText}
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-2">
        {stories.slice(0, max).map(s => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => setSelected(s)}
              className="gd-card flex w-full items-center gap-3 p-2.5 text-left"
              aria-label={`${s.is_video ? 'Video' : 'Story'}: ${s.headline}`}
            >
              <span className="relative aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-xl bg-ink-800">
                {s.image ? (
                  <img src={s.image} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-ink-700 to-ink-900">
                    <Newspaper className="h-6 w-6 text-white/60" />
                  </span>
                )}
                {s.is_video && (
                  <>
                    <span className="absolute inset-0 m-auto flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white shadow-[0_0_14px_-2px_rgb(var(--gd-brand)/0.7)]">
                      <Play className="ml-0.5 h-3.5 w-3.5 fill-white" />
                    </span>
                    {s.duration_label && (
                      <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 text-[10px] font-semibold text-white tabular-nums">
                        {s.duration_label}
                      </span>
                    )}
                  </>
                )}
              </span>
              <span className="min-w-0 flex-1 pr-1">
                {s.team?.name && (
                  <span className="block truncate text-[10px] font-bold uppercase tracking-[0.12em] text-orange-600 dark:text-brand-soft">
                    {s.team.name}
                  </span>
                )}
                <span className="block text-sm font-semibold leading-snug text-on-surface line-clamp-2">{s.headline}</span>
                <span className="mt-1 block text-xs text-on-surface-variant">
                  {[s.is_video ? 'Video' : s.source, ago(s.published)].filter(Boolean).join(' • ')}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <VideoStorySheet video={selected} open={!!selected} onOpenChange={open => !open && setSelected(null)} />
    </>
  );
}
