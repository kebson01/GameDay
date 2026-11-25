// Team-area data helpers (TeamPage, MyTeams, DiscoverTeams).
// Read-only wrappers around ESPN's public college-football endpoints.
import { POPULAR_TEAMS, findTeam, teamLogoUrl } from '@/lib/sportsApi';

const ESPN_BASE = import.meta.env.VITE_ESPN_BASE_URL || 'https://site.api.espn.com/apis/site/v2/sports/football/college-football';

const hex = (c) => (c ? (c.startsWith('#') ? c : `#${c}`) : null);

// Every ESPN college-football team, keyed by id: { id, name, location, short, abbreviation, color, alt_color, logo }
let indexPromise = null;
export function fetchTeamIndex() {
  if (!indexPromise) {
    indexPromise = fetch(`${ESPN_BASE}/teams?limit=1000`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        const map = {};
        (d?.sports?.[0]?.leagues?.[0]?.teams || []).forEach(({ team: t }) => {
          map[String(t.id)] = {
            id: String(t.id),
            name: t.displayName,
            location: t.location,
            short: t.shortDisplayName || t.location,
            abbreviation: t.abbreviation,
            color: hex(t.color),
            alt_color: hex(t.alternateColor),
            logo: t.logos?.[0]?.href || teamLogoUrl(t.id),
          };
        });
        return map;
      })
      .catch(() => { indexPromise = null; return {}; });
  }
  return indexPromise;
}

/** Resolve a team name used in the app ("Georgia" or "Georgia Bulldogs") to { id, name, ... } or null */
export async function resolveTeam(name) {
  if (!name) return null;
  const needle = name.trim().toLowerCase();
  const popular = POPULAR_TEAMS.find(t => t.name.toLowerCase() === needle);
  const index = await fetchTeamIndex();
  if (popular && index[popular.id]) return { ...index[popular.id], conference: popular.conference };
  const espn = await findTeam(name);
  if (!espn) return popular ? { id: popular.id, name: popular.name, abbreviation: popular.abbreviation, logo: teamLogoUrl(popular.id), conference: popular.conference } : null;
  return index[String(espn.id)] || {
    id: String(espn.id),
    name: espn.displayName,
    location: espn.location,
    short: espn.shortDisplayName,
    abbreviation: espn.abbreviation,
    color: hex(espn.color),
    alt_color: hex(espn.alternateColor),
    logo: teamLogoUrl(espn.id),
  };
}

/** Does a saved favorite name refer to this team? */
export function isSameTeam(favName, team) {
  if (!favName || !team) return false;
  const f = favName.trim().toLowerCase();
  return [team.name, team.location, team.short].some(n => n && n.toLowerCase() === f);
}

// Convert an ESPN event (team endpoint's nextEvent) into the scoreboard game shape
// used by components/scores (FeaturedGame / ScoreCard).
export function eventToGame(event) {
  const comp = event?.competitions?.[0];
  if (!comp) return null;
  const side = (ha) => comp.competitors?.find(c => c.homeAway === ha);
  const home = side('home');
  const away = side('away');
  const state = comp.status?.type?.state;
  const status = state === 'in' ? 'live' : state === 'post' ? 'final' : 'upcoming';
  const score = (c) => parseInt(c?.score?.value ?? c?.score?.displayValue ?? c?.score, 10) || 0;
  const rank = (c) => (c?.curatedRank?.current && c.curatedRank.current <= 25 ? c.curatedRank.current : null);
  const t = (c, k) => c?.team?.[k];
  const date = event.date ? new Date(event.date) : null;
  return {
    id: event.id,
    home_team: t(home, 'displayName') || 'TBD',
    away_team: t(away, 'displayName') || 'TBD',
    home_short: t(home, 'shortDisplayName') || t(home, 'location'),
    away_short: t(away, 'shortDisplayName') || t(away, 'location'),
    home_abbrev: t(home, 'abbreviation'),
    away_abbrev: t(away, 'abbreviation'),
    home_team_id: t(home, 'id'),
    away_team_id: t(away, 'id'),
    home_logo: t(home, 'logos')?.[0]?.href || teamLogoUrl(t(home, 'id')),
    away_logo: t(away, 'logos')?.[0]?.href || teamLogoUrl(t(away, 'id')),
    home_score: score(home),
    away_score: score(away),
    home_rank: rank(home),
    away_rank: rank(away),
    home_record: home?.record?.[0]?.displayValue || null,
    away_record: away?.record?.[0]?.displayValue || null,
    status,
    status_short: comp.status?.type?.shortDetail || null,
    quarter: comp.status?.period ? `Q${comp.status.period}` : null,
    time_remaining: comp.status?.displayClock,
    full_date: event.date,
    game_time: date ? date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'TBD',
    game_date: date ? date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'TBD',
    venue: comp.venue?.fullName || null,
    tv_network: comp.broadcasts?.[0]?.media?.shortName || null,
    odds: comp.odds?.[0]?.details || null,
    over_under: comp.odds?.[0]?.overUnder ?? null,
    headline: comp.notes?.[0]?.headline || null,
  };
}

/** Team profile from ESPN's team endpoint: colors, record, standing and next game */
export async function fetchTeamProfile(teamId) {
  if (!teamId) return null;
  const res = await fetch(`${ESPN_BASE}/teams/${teamId}`);
  if (!res.ok) throw new Error('Failed to fetch team');
  const t = (await res.json()).team;
  if (!t) return null;
  return {
    id: String(t.id),
    name: t.displayName,
    location: t.location,
    short: t.shortDisplayName || t.location,
    mascot: t.name,
    abbreviation: t.abbreviation,
    color: hex(t.color),
    alt_color: hex(t.alternateColor),
    logo: t.logos?.[0]?.href || teamLogoUrl(t.id),
    record: t.record?.items?.[0]?.summary || null,
    standing: t.standingSummary || null,
    next_game: t.nextEvent?.[0] ? eventToGame(t.nextEvent[0]) : null,
  };
}

/** Season summary computed from a fetchTeamSchedule() list */
export function summarizeSchedule(schedule = []) {
  const finals = schedule.filter(g => g.result);
  const sum = (fn) => finals.reduce((n, g) => n + fn(g), 0);
  const wl = (list) => `${list.filter(g => g.result.won).length}-${list.filter(g => !g.result.won).length}`;
  // Current streak from the most recent finals backwards
  let streak = null;
  const recent = [...finals].sort((a, b) => new Date(b.date) - new Date(a.date));
  if (recent.length) {
    const won = recent[0].result.won;
    let n = 0;
    while (n < recent.length && recent[n].result.won === won) n++;
    streak = `${won ? 'W' : 'L'}${n}`;
  }
  return {
    played: finals.length,
    wins: finals.filter(g => g.result.won).length,
    losses: finals.filter(g => !g.result.won).length,
    remaining: schedule.filter(g => g.status === 'upcoming').length,
    ppg: finals.length ? sum(g => g.result.team_score) / finals.length : null,
    opp_ppg: finals.length ? sum(g => g.result.opponent_score) / finals.length : null,
    home: wl(finals.filter(g => g.is_home)),
    away: wl(finals.filter(g => !g.is_home)),
    ranked: wl(finals.filter(g => g.opponent_rank)),
    streak,
  };
}

/** LiveGame link for a game in scoreboard shape */
export const liveGameQuery = (g) =>
  `?gameId=${g.id}&home=${encodeURIComponent(g.home_team)}&away=${encodeURIComponent(g.away_team)}`;

/** TeamPage link for a team; the ESPN id (when known) skips name lookup */
export const teamPageQuery = (name, id) =>
  `?team=${encodeURIComponent(name || '')}${id ? `&teamId=${encodeURIComponent(id)}` : ''}`;

/** Resolve by ESPN id first, then by name */
export async function resolveTeamById(id, name) {
  if (id) {
    const index = await fetchTeamIndex();
    const hit = index[String(id)];
    if (hit) {
      const popular = POPULAR_TEAMS.find(t => String(t.id) === String(id));
      return popular ? { ...hit, conference: popular.conference } : hit;
    }
  }
  return resolveTeam(name);
}
