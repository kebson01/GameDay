import React from 'react';
import { Clock, ExternalLink, Film, Newspaper, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNewsDate } from '@/lib/feedData';

/** Wraps a story in a button (videos open in-app) or an external link (articles). */
function StoryLink({ article, onOpenVideo, className, children }) {
  if (article.is_video) {
    return (
      <button
        type="button"
        onClick={() => onOpenVideo(article)}
        className={cn('block w-full text-left', className)}
        aria-label={`Video: ${article.headline}`}
      >
        {children}
      </button>
    );
  }
  return (
    <a href={article.link} target="_blank" rel="noopener noreferrer" className={cn('block', className)}>
      {children}
    </a>
  );
}

function PlayBadge({ size = 'lg' }) {
  return (
    <span
      className={cn(
        'absolute inset-0 m-auto flex items-center justify-center rounded-full bg-brand text-white shadow-[0_0_20px_-2px_rgb(var(--gd-brand)/0.7)]',
        size === 'lg' ? 'h-14 w-14' : 'h-9 w-9'
      )}
      aria-hidden="true"
    >
      <Play className={cn('fill-white', size === 'lg' ? 'ml-1 h-6 w-6' : 'ml-0.5 h-4 w-4')} />
    </span>
  );
}

/** Big hero card for the lead story. */
export function LeadStory({ article, onOpenVideo }) {
  return (
    <StoryLink article={article} onOpenVideo={onOpenVideo} className="gd-card gd-card-glow overflow-hidden">
      <div className="relative aspect-[4/3] min-h-[260px] bg-ink-900">
        {article.image && <img src={article.image} alt="" className="absolute inset-0 h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
        {article.is_video && <PlayBadge />}
        <div className="absolute left-3 right-3 top-3 flex items-center gap-2">
          <span className="gd-pill bg-brand text-white shadow-[0_0_14px_-4px_rgb(var(--gd-brand)/0.8)]">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            {article.is_video ? 'Video' : 'Top story'} · {formatNewsDate(article.published)}
          </span>
          {article.premium && <span className="gd-pill ml-auto bg-amber-400 text-ink-900">ESPN+</span>}
        </div>
        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-ondark">
            {article.source || 'ESPN'} · College Football
          </p>
          <h2 className="line-clamp-3 font-display text-[28px] font-bold uppercase leading-[1.05] tracking-tight text-white">
            {article.headline}
          </h2>
          {article.description && (
            <p className="mt-1.5 line-clamp-2 text-sm text-white/80">{article.description}</p>
          )}
          <p className="mt-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-brand-ondark">
            {article.is_video ? (
              <><Play className="h-3 w-3 fill-current" />Watch</>
            ) : (
              <>Read story<ExternalLink className="h-3 w-3" /></>
            )}
          </p>
        </div>
      </div>
    </StoryLink>
  );
}

/** Compact list row: text on the left, thumbnail on the right. */
export function StoryRow({ article, onOpenVideo }) {
  return (
    <StoryLink article={article} onOpenVideo={onOpenVideo} className="gd-card p-3.5 transition-colors hover:border-brand/50">
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider">
            {article.is_video ? (
              <span className="gd-pill bg-red-600/15 px-1.5 text-red-700"><Film className="h-3 w-3" />Video</span>
            ) : (
              <span className="text-orange-600 dark:text-brand-soft">{article.source || 'ESPN'}</span>
            )}
            {article.premium && <span className="gd-pill bg-amber-400 px-1.5 text-ink-900">ESPN+</span>}
            <span className="flex items-center gap-1 font-semibold normal-case tracking-normal text-on-surface-variant">
              <Clock className="h-3 w-3" />{formatNewsDate(article.published)}
            </span>
          </p>
          <h3 className="mt-1 line-clamp-3 text-[15px] font-bold leading-snug text-on-surface">{article.headline}</h3>
          {article.description && (
            <p className="mt-1 line-clamp-2 text-xs text-on-surface-variant">{article.description}</p>
          )}
        </div>
        <div className="relative h-[84px] w-[104px] shrink-0 overflow-hidden rounded-xl bg-surface-container-high">
          {article.image ? (
            <img src={article.image} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-on-surface-variant">
              <Newspaper className="h-6 w-6" />
            </span>
          )}
          {article.is_video && <PlayBadge size="sm" />}
        </div>
      </div>
    </StoryLink>
  );
}
