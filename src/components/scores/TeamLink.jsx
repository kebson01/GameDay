import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { teamPageQuery } from '@/lib/teamData';
import { cn } from '@/lib/utils';

/**
 * Tappable team (logo / name) inside a game card. Opens that team's page
 * (schedule, past results, news) without also opening the game.
 */
export default function TeamLink({ name, teamId, className, children }) {
  const navigate = useNavigate();
  if (!name && !teamId) return <span className={className}>{children}</span>;
  const open = (e) => {
    e.stopPropagation();
    e.preventDefault();
    navigate(createPageUrl('TeamPage') + teamPageQuery(name, teamId));
  };
  return (
    <button
      type="button"
      onClick={open}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); }}
      className={cn('rounded-lg transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500', className)}
      aria-label={`${name || 'Team'}: team page and past games`}
    >
      {children}
    </button>
  );
}

/** Make a card div behave like a button (so team links can sit inside it) */
export const cardButtonProps = (onActivate, label) => ({
  role: 'button',
  tabIndex: 0,
  'aria-label': label,
  onClick: onActivate,
  onKeyDown: (e) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActivate(); }
  },
});
