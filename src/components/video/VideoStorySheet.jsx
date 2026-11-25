import React from 'react';
import { Play, ExternalLink, Clock, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { openOnEspn } from './openOnEspn';

/**
 * In-app story view. The story (headline, description, image) stays in GameDay;
 * for videos "Watch" opens ESPN's player over the app, for articles "Read"
 * opens the full ESPN story over the app. Articles pass is_video: false.
 */
export default function VideoStorySheet({ video, open, onOpenChange }) {
  if (!video) return null;
  const isArticle = video.is_video === false;
  const image = video.thumbnail || video.image;
  const watch = () => openOnEspn(video.url);
  let published = null;
  try {
    published = video.published ? format(new Date(video.published), 'MMM d, yyyy • h:mm a') : null;
  } catch {
    published = null;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* The built-in close (X) is SheetContent's only direct <button> child; [&>button] keeps it above the video */}
      <SheetContent
        side="bottom"
        className="max-h-[92vh] overflow-y-auto rounded-t-3xl border-outline-variant bg-surface-container p-0 pb-[max(1.5rem,env(safe-area-inset-bottom))] [&>button]:z-20 [&>button]:top-5 [&>button]:right-3 [&>button]:rounded-full [&>button]:bg-black/60 [&>button]:p-1.5 [&>button]:text-white [&>button]:opacity-100"
      >
        <div>
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-slate-200" aria-hidden="true" />

        {isArticle ? (
          image ? (
            <div className="mt-3 aspect-video w-full overflow-hidden bg-ink-900">
              <img src={image} alt="" className="h-full w-full object-cover" />
            </div>
          ) : <div className="h-10" />
        ) : (
        <button
          type="button"
          onClick={watch}
          className="relative mt-3 block w-full aspect-video bg-ink-900 overflow-hidden"
          aria-label="Play video on ESPN"
        >
          {image && (
            <img src={image} alt="" className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-black/25" />
          <span className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white shadow-[0_0_24px_-2px_rgb(var(--gd-brand)/0.8)]">
            <Play className="ml-1 h-7 w-7 fill-white" />
          </span>
          {video.duration_label && (
            <span className="absolute bottom-2 right-2 rounded bg-black/75 px-2 py-0.5 text-xs font-semibold text-white tabular-nums">
              {video.duration_label}
            </span>
          )}
        </button>
        )}

        <div className="px-5 pt-4">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded bg-red-600 px-1.5 py-0.5 font-bold text-white">ESPN</span>
            {video.team?.name && (
              <span className="flex items-center gap-1 font-semibold text-slate-700">
                {video.team.logo && <img src={video.team.logo} alt="" className="h-4 w-4 object-contain" />}
                {video.team.name}
              </span>
            )}
            {video.premium && (
              <span className="rounded bg-yellow-400 px-1.5 py-0.5 font-bold text-ink-900">ESPN+</span>
            )}
            {published && (
              <span className="flex items-center gap-1 text-slate-500">
                <Clock className="h-3 w-3" />
                {published}
              </span>
            )}
          </div>

          <SheetTitle className="font-display text-2xl font-bold uppercase leading-tight text-slate-900">
            {video.headline}
          </SheetTitle>
          <SheetDescription className={video.description ? 'mt-2 text-base text-slate-600' : 'sr-only'}>
            {video.description || (isArticle ? 'Story from ESPN' : 'Video highlight from ESPN')}
          </SheetDescription>

          <button
            type="button"
            onClick={watch}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full gd-btn-primary py-3.5 font-display text-xl font-bold uppercase tracking-wide"
          >
            {isArticle ? <BookOpen className="h-5 w-5" /> : <Play className="h-5 w-5 fill-white" />}
            {isArticle ? 'Read full story on ESPN' : 'Watch on ESPN'}
            <ExternalLink className="h-4 w-4 opacity-80" />
          </button>
          <p className="mt-2 text-center text-xs text-slate-500">
            {isArticle
              ? 'The full story opens over GameDay. Close it to come back here.'
              : "ESPN's player opens over GameDay. Close it to come back to this story."}
            {video.premium ? (isArticle ? ' This story needs an ESPN+ login.' : ' This video needs an ESPN+ login.') : ''}
          </p>
        </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
