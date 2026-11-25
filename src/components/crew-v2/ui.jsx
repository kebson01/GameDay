import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

/** Brand-orange switch that reads well on both surfaces. */
export function GdSwitch({ className, ...props }) {
  return (
    <Switch
      className={cn(
        'h-6 w-11 data-[state=checked]:bg-brand data-[state=unchecked]:bg-surface-container-highest',
        'dark:data-[state=unchecked]:bg-white/15 [&>span]:h-5 [&>span]:w-5 [&>span]:bg-white',
        '[&>span[data-state=checked]]:translate-x-5',
        className
      )}
      {...props}
    />
  );
}

/** Icon tile used in headings and rows. */
export function IconTile({ icon: Icon, tone = 'brand', className }) {
  const tones = {
    brand: 'bg-brand/15 text-orange-600 dark:text-brand-soft',
    win: 'bg-emerald-500/15 text-emerald-600 dark:text-brand-win',
    gold: 'bg-amber-500/15 text-amber-600 dark:text-brand-highlight',
    neutral: 'bg-surface-container-high text-on-surface-variant dark:bg-surface-container-highest',
    danger: 'bg-red-500/15 text-red-600 dark:text-red-400',
  };
  return (
    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tones[tone], className)}>
      <Icon className="h-5 w-5" />
    </span>
  );
}

/** gd-card with a condensed uppercase heading. */
export function SectionCard({ title, icon, aside, children, className, bodyClassName }) {
  return (
    <section className={cn('gd-card overflow-hidden', className)}>
      {title && (
        <div className="flex items-center justify-between gap-3 px-4 pt-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold uppercase text-on-surface">
            {icon && React.createElement(icon, { className: 'h-5 w-5 text-orange-600 dark:text-brand-soft' })}
            {title}
          </h2>
          {aside}
        </div>
      )}
      <div className={cn('p-4', bodyClassName)}>{children}</div>
    </section>
  );
}

/** Row inside a settings card: label + description + trailing control. */
export function SettingRow({ icon, title, description, control, onClick, tone, danger, className }) {
  const body = (
    <>
      {icon && <IconTile icon={icon} tone={danger ? 'danger' : tone || 'neutral'} className="h-9 w-9" />}
      <div className="min-w-0 flex-1 text-left">
        <p className={cn('text-[15px] font-semibold', danger ? 'text-red-600 dark:text-red-400' : 'text-on-surface')}>{title}</p>
        {description && <p className="text-xs text-on-surface-variant">{description}</p>}
      </div>
      {control ?? (onClick && !danger && <ChevronRight className="h-5 w-5 shrink-0 text-on-surface-variant" />)}
    </>
  );
  const cls = cn('flex w-full items-center gap-3 px-4 py-3', className);
  return onClick ? (
    <button type="button" onClick={onClick} className={cn(cls, 'transition-colors hover:bg-surface-container-high/60')}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Divided list of SettingRows inside a card. */
export function RowGroup({ title, children }) {
  return (
    <section className="gd-card overflow-hidden">
      {title && <p className="gd-eyebrow px-4 pt-4 pb-1">{title}</p>}
      <div className="divide-y divide-outline-variant dark:divide-white/[0.06]">{children}</div>
    </section>
  );
}

/** Signed-out call to action card. */
export function SignInCard({ icon, title = 'Sign in required', text, onSignIn, children }) {
  return (
    <section className="gd-card px-6 py-8 text-center">
      {icon && <IconTile icon={icon} className="mx-auto h-14 w-14 rounded-2xl [&>svg]:h-7 [&>svg]:w-7" />}
      <h2 className="mt-4 font-display text-2xl font-bold uppercase text-on-surface">{title}</h2>
      {text && <p className="mt-1 text-sm text-on-surface-variant">{text}</p>}
      <button
        type="button"
        onClick={onSignIn}
        className="gd-btn-primary mt-6 h-12 w-full rounded-xl font-display text-lg font-bold uppercase"
      >
        Sign In
      </button>
      {children}
    </section>
  );
}

/** Centered empty state inside a card. */
export function EmptyCard({ emoji, icon, title, text, children }) {
  return (
    <div className="gd-card px-6 py-10 text-center">
      {emoji && <p className="text-4xl" aria-hidden="true">{emoji}</p>}
      {icon && React.createElement(icon, { className: 'mx-auto h-10 w-10 text-on-surface-variant/60' })}
      <p className="mt-2 font-display text-xl font-bold uppercase text-on-surface">{title}</p>
      {text && <p className="mt-1 text-sm text-on-surface-variant">{text}</p>}
      {children}
    </div>
  );
}

/** Small field label + control wrapper for forms. */
export function Field({ label, htmlFor, hint, children, className }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-on-surface-variant">{hint}</p>}
    </div>
  );
}
