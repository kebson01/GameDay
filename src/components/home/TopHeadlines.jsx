import React from 'react';
import { AlignLeft, Play } from 'lucide-react';

/** Compact text list of headlines, placed between feed cards. */
export default function TopHeadlines({ stories = [], onOpen, title = 'Top Headlines' }) {
  if (!stories.length) return null;
  return (
    <section aria-labelledby="top-headlines" className="rounded-2xl border border-outline-variant bg-surface-container px-4 py-5 shadow-sm">
      <h2 id="top-headlines" className="mb-3 px-1 text-lg font-extrabold tracking-wide text-slate-900">{title}</h2>
      <ul className="divide-y divide-outline-variant/60">
        {stories.map(story => (
          <li key={story.id}>
            <button type="button" onClick={() => onOpen(story)} className="flex w-full items-start gap-3 px-1 py-3 text-left">
              {story.is_video ? (
                <Play className="mt-0.5 h-4 w-4 shrink-0 fill-current text-orange-500" />
              ) : (
                <AlignLeft className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              )}
              <span className="text-[15px] font-semibold leading-snug text-slate-900">{story.headline}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
