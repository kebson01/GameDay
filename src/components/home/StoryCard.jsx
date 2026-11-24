import React from 'react';
import { Play, Radio } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';

function ago(date) {
  if (!date) return null;
  try {
    const d = formatDistanceToNowStrict(new Date(date));
    return d.replace(/ seconds?/, 's').replace(/ minutes?/, 'm').replace(/ hours?/, 'h').replace(/ days?/, 'd')
      .replace(/ months?/, 'mo').replace(/ years?/, 'y');
  } catch {
    return null;
  }
}

/** Feed card: team label, condensed headline, summary, source • time, full-width photo. */
export default function StoryCard({ story, onOpen }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container shadow-sm">
      <button type="button" onClick={() => onOpen(story)} className="block w-full text-left" aria-label={story.headline}>
        <div className="px-4 pt-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            {story.team?.logo ? (
              <img src={story.team.logo} alt="" className="h-6 w-6 object-contain" loading="lazy" />
            ) : (
              <Radio className="h-5 w-5 text-red-500" />
            )}
            <span className="truncate">{story.team?.name || 'College Football'}</span>
          </div>
          <h3 className="font-display text-[26px] font-bold leading-[1.1] text-slate-900">{story.headline}</h3>
          {story.description && (
            <p className="mt-2 text-[15px] leading-snug text-slate-600 line-clamp-3">{story.description}</p>
          )}
          <p className="mt-2 pb-3 text-xs text-slate-500">
            {[story.source, ago(story.published)].filter(Boolean).join(' • ')}
          </p>
        </div>
        {story.image && (
          <div className="relative aspect-[16/9] w-full bg-ink-900">
            <img src={story.image} alt="" className="h-full w-full object-cover" loading="lazy" />
            {story.is_video && (
              <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/75 px-2.5 py-1 text-xs font-semibold text-white tabular-nums">
                <Play className="h-3 w-3 fill-white" />
                {story.duration_label || 'Video'}
              </span>
            )}
            {story.premium && (
              <span className="absolute left-3 top-3 rounded bg-yellow-400 px-1.5 py-0.5 text-[10px] font-bold text-ink-900">ESPN+</span>
            )}
          </div>
        )}
      </button>
    </article>
  );
}
