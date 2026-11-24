import React, { useState } from 'react';
import { Film } from 'lucide-react';
import { Skeleton } from '@/components/common/LoadingSkeleton';
import VideoCard from './VideoCard';
import VideoStorySheet from './VideoStorySheet';

/**
 * List of video highlights. The first clip can be featured as a large tile
 * (e.g. the game recap). Tapping any clip opens the in-app story sheet.
 */
export default function VideoHighlights({
  videos = [],
  isLoading = false,
  featureFirst = true,
  layout = 'list', // 'list' (vertical) | 'rail' (horizontal swipe row)
  maxItems,
  emptyTitle = 'No highlights yet',
  emptyText = 'Video highlights usually appear shortly after big plays and after the game.',
}) {
  const [selected, setSelected] = useState(null);
  const list = maxItems ? videos.slice(0, maxItems) : videos;

  if (layout === 'rail') {
    if (isLoading) {
      return (
        <div className="-mx-4 flex gap-3 overflow-hidden px-4" aria-busy="true">
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-52 w-64 shrink-0 rounded-2xl" />
          ))}
        </div>
      );
    }
    if (list.length === 0) return null;
    return (
      <>
        <div
          className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
          role="list"
        >
          {list.map(v => (
            <div key={v.id} role="listitem" className="w-64 shrink-0 snap-start">
              <VideoCard video={v} layout="tile" onOpen={setSelected} className="h-full" />
            </div>
          ))}
        </div>
        <VideoStorySheet
          video={selected}
          open={!!selected}
          onOpenChange={open => !open && setSelected(null)}
        />
      </>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="aspect-video w-full rounded-2xl" />
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="gd-card py-10 px-6 text-center">
        <Film className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <p className="font-semibold text-slate-900">{emptyTitle}</p>
        <p className="mt-1 text-sm text-slate-500">{emptyText}</p>
      </div>
    );
  }

  const [first, ...rest] = list;
  return (
    <>
      <div className="space-y-3">
        {featureFirst ? (
          <>
            <VideoCard video={first} layout="tile" onOpen={setSelected} />
            {rest.map(v => (
              <VideoCard key={v.id} video={v} onOpen={setSelected} />
            ))}
          </>
        ) : (
          list.map(v => <VideoCard key={v.id} video={v} onOpen={setSelected} />)
        )}
      </div>
      <VideoStorySheet
        video={selected}
        open={!!selected}
        onOpenChange={open => !open && setSelected(null)}
      />
    </>
  );
}
