// Small presentation helpers for the News / Standings screens.

export const formatNewsDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffHours < 48) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const pct = (w, l) => (w + l ? w / (w + l) : 0);

/** Sort a conference's teams: by conference record (default) or overall record. */
export function sortStandings(teams, mode = 'conf') {
  return [...teams].sort((a, b) => {
    if (mode === 'conf') {
      const d = pct(b.conference_wins, b.conference_losses) - pct(a.conference_wins, a.conference_losses);
      if (d) return d;
      if (b.conference_wins !== a.conference_wins) return b.conference_wins - a.conference_wins;
    }
    const o = (b.win_percentage || 0) - (a.win_percentage || 0);
    if (o) return o;
    return (b.wins || 0) - (a.wins || 0);
  });
}
