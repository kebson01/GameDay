// Sports Data API Service
// Uses ESPN's public endpoints for college football data

// API endpoints from environment variables (with defaults)
const ESPN_BASE = import.meta.env.VITE_ESPN_BASE_URL || 'https://site.api.espn.com/apis/site/v2/sports/football/college-football';
const ESPN_CORE = import.meta.env.VITE_ESPN_CORE_URL || 'https://sports.core.api.espn.com/v2/sports/football/leagues/college-football';

// App configuration
const REFRESH_INTERVAL = Number(import.meta.env.VITE_REFRESH_INTERVAL) || 60000;

// Get current season year (CFB season runs Aug-Jan)
export function getCurrentSeason() {
  const now = new Date();
  const month = now.getMonth();
  // If we're in Jan-Jul, the season is the previous year
  return month < 7 ? now.getFullYear() - 1 : now.getFullYear();
}

const DEFAULT_LIMIT = 1000;

async function fetchScoreboardJson(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    search.set(k, String(v));
  });
  if (!search.has('limit')) search.set('limit', String(DEFAULT_LIMIT));

  const url = `${ESPN_BASE}/scoreboard?${search.toString()}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch scoreboard (${response.status})`);
  return await response.json();
}

// Fetch scoreboard for current/today
export async function fetchScoreboard() {
  try {
    const data = await fetchScoreboardJson();
    return parseGames(data.events || []);
  } catch (error) {
    console.error('Error fetching scoreboard:', error);
    return [];
  }
}

// Fetch scoreboard for a specific date (YYYYMMDD format)
export async function fetchScoreboardByDate(date) {
  try {
    const dateStr = typeof date === 'string' 
      ? date.replace(/-/g, '')
      : date.toISOString().split('T')[0].replace(/-/g, '');

    const data = await fetchScoreboardJson({ dates: dateStr });
    return parseGames(data.events || []);
  } catch (error) {
    console.error('Error fetching scoreboard:', error);
    return [];
  }
}

// Fetch games for a specific week using seasontype and week params
export async function fetchWeekByNumber(weekNumber, seasonType = 2, year = getCurrentSeason()) {
  try {
    // seasonType: 1=preseason, 2=regular, 3=postseason, 4=off
    const data = await fetchScoreboardJson({
      dates: year,
      seasontype: seasonType,
      week: weekNumber,
    });
    
    return {
      games: parseGames(data.events || []),
      week: data.week,
      season: data.season,
      calendar: data.leagues?.[0]?.calendar || [],
    };
  } catch (error) {
    console.error('Error fetching week:', error);
    return { games: [], week: null, season: null, calendar: [] };
  }
}

// Fetch games for a date range (max 13 months)
export async function fetchGamesByDateRange(startDate, endDate) {
  try {
    // Format: YYYYMMDD-YYYYMMDD
    const start = typeof startDate === 'string' 
      ? startDate.replace(/-/g, '') 
      : startDate.toISOString().split('T')[0].replace(/-/g, '');
    const end = typeof endDate === 'string' 
      ? endDate.replace(/-/g, '') 
      : endDate.toISOString().split('T')[0].replace(/-/g, '');

    const data = await fetchScoreboardJson({ dates: `${start}-${end}` });
    return parseGames(data.events || []);
  } catch (error) {
    console.error('Error fetching games by date range:', error);
    return [];
  }
}

// Fetch entire season (regular season)
export async function fetchSeasonGames(year = getCurrentSeason(), seasonType = 2) {
  try {
    const data = await fetchScoreboardJson({
      dates: year,
      seasontype: seasonType,
    });
    
    return {
      games: parseGames(data.events || []),
      calendar: data.leagues?.[0]?.calendar || [],
    };
  } catch (error) {
    console.error('Error fetching season games:', error);
    return { games: [], calendar: [] };
  }
}

// Fetch calendar/schedule structure for the season
export async function fetchSeasonCalendar(year = getCurrentSeason()) {
  try {
    const data = await fetchScoreboardJson({ dates: year, limit: 200 });
    
    // Get the calendar from the response
    const calendar = data.leagues?.[0]?.calendar || [];
    
    // Flatten and parse the calendar entries
    const weeks = [];
    calendar.forEach(section => {
      if (section.entries) {
        section.entries.forEach(entry => {
          weeks.push({
            label: entry.label,
            value: entry.value,
            startDate: entry.startDate,
            endDate: entry.endDate,
            detail: entry.detail,
            alternateLabel: entry.alternateLabel,
          });
        });
      } else if (section.startDate && section.endDate) {
        weeks.push({
          label: section.label,
          value: section.value,
          startDate: section.startDate,
          endDate: section.endDate,
        });
      }
    });
    
    return weeks;
  } catch (error) {
    console.error('Error fetching calendar:', error);
    return [];
  }
}

/**
 * Fetch games using an ESPN calendar entry (from `fetchSeasonCalendar`).
 *
 * ESPN CFB currently uses:
 * - Regular season: label "Week N", value "N"  → seasontype=2&week=N
 * - Bowls: label "Bowls", value "1"            → seasontype=3&week=1
 * - CFP: label "CFP", value "999"              → seasontype=3&week=999
 *
 * If it doesn't match, we fall back to the entry date range.
 */
export async function fetchGamesForCalendarEntry(entry, year = getCurrentSeason()) {
  if (!entry) return [];

  const label = entry.label || '';
  const value = entry.value;

  // Prefer week-based fetching (more complete than date ranges).
  if (label.startsWith('Week')) {
    const week = Number(value);
    if (Number.isFinite(week)) {
      const { games } = await fetchWeekByNumber(week, 2, year);
      return games;
    }
  }

  if (label === 'Bowls') {
    const week = Number(value) || 1;
    const { games } = await fetchWeekByNumber(week, 3, year);
    return games;
  }

  if (label === 'CFP') {
    const week = Number(value) || 999;
    const { games } = await fetchWeekByNumber(week, 3, year);
    return games;
  }

  // Fallback: date range (some ESPN calendars have odd/buggy ranges; callers should avoid this when possible).
  if (entry.startDate && entry.endDate) {
    return await fetchGamesByDateRange(entry.startDate, entry.endDate);
  }

  return [];
}

// Parse games from ESPN response
function parseGames(events) {
  return events.map(event => {
    const competition = event.competitions?.[0];
    const homeTeam = competition?.competitors?.find(c => c.homeAway === 'home');
    const awayTeam = competition?.competitors?.find(c => c.homeAway === 'away');
    const situation = competition?.situation;
    
    let status = 'upcoming';
    if (competition?.status?.type?.state === 'in') status = 'live';
    else if (competition?.status?.type?.state === 'post') status = 'final';
    
    return {
      id: event.id,
      name: event.name,
      short_name: event.shortName,
      home_team: homeTeam?.team?.displayName || homeTeam?.team?.name || 'TBD',
      away_team: awayTeam?.team?.displayName || awayTeam?.team?.name || 'TBD',
      home_score: parseInt(homeTeam?.score) || 0,
      away_score: parseInt(awayTeam?.score) || 0,
      home_logo: homeTeam?.team?.logo,
      away_logo: awayTeam?.team?.logo,
      home_abbrev: homeTeam?.team?.abbreviation,
      away_abbrev: awayTeam?.team?.abbreviation,
      home_rank: homeTeam?.curatedRank?.current <= 25 ? homeTeam?.curatedRank?.current : null,
      away_rank: awayTeam?.curatedRank?.current <= 25 ? awayTeam?.curatedRank?.current : null,
      home_record: homeTeam?.records?.[0]?.summary,
      away_record: awayTeam?.records?.[0]?.summary,
      status,
      quarter: situation?.period ? `Q${situation.period}` : competition?.status?.period ? `Q${competition.status.period}` : null,
      time_remaining: competition?.status?.displayClock || situation?.clock?.displayValue,
      status_detail: competition?.status?.type?.detail,
      game_time: event.date ? new Date(event.date).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      }) : 'TBD',
      game_date: event.date ? new Date(event.date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      }) : 'TBD',
      full_date: event.date,
      venue: competition?.venue?.fullName || 'TBD',
      city: competition?.venue?.address?.city,
      state: competition?.venue?.address?.state,
      tv_network: competition?.broadcasts?.[0]?.names?.[0] || competition?.geoBroadcasts?.[0]?.media?.shortName,
      odds: competition?.odds?.[0]?.details,
      spread: competition?.odds?.[0]?.spread,
      headline: event.competitions?.[0]?.notes?.[0]?.headline,
      week: event.week?.number,
      season_type: event.season?.type,
      conference_competition: competition?.conferenceCompetition,
    };
  }).sort((a, b) => {
    // Sort by date, then by status (live first)
    if (a.status === 'live' && b.status !== 'live') return -1;
    if (b.status === 'live' && a.status !== 'live') return 1;
    return new Date(a.full_date) - new Date(b.full_date);
  });
}

// Fetch team schedule for a specific team
export async function fetchTeamSchedule(teamId, year = getCurrentSeason()) {
  try {
    // First get the schedule to know which games to fetch
    const scheduleRes = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/${teamId}/schedule?season=${year}`
    );
    if (!scheduleRes.ok) throw new Error('Failed to fetch schedule');
    const scheduleData = await scheduleRes.json();
    
    const requestedTeamId = String(teamId);
    const events = scheduleData.events || [];
    
    // For each event, we need to get the game summary to get scores
    const gamesWithScores = await Promise.all(
      events.map(async (event, idx) => {
        try {
          // Fetch game summary which has full score data
          const summaryRes = await fetch(
            `https://site.api.espn.com/apis/site/v2/sports/football/college-football/summary?event=${event.id}`
          );
          
          if (!summaryRes.ok) {
            // Fallback to schedule data
            return parseScheduleEvent(event, requestedTeamId, idx);
          }
          
          const summaryData = await summaryRes.json();
          const competition = summaryData.header?.competitions?.[0];
          
          if (!competition) {
            return parseScheduleEvent(event, requestedTeamId, idx);
          }
          
          const homeTeam = competition.competitors?.find(c => c.homeAway === 'home');
          const awayTeam = competition.competitors?.find(c => c.homeAway === 'away');
          
          const homeTeamId = String(homeTeam?.id || homeTeam?.team?.id || '');
          const isHome = homeTeamId === requestedTeamId;
          const opponent = isHome ? awayTeam : homeTeam;
          const ourTeam = isHome ? homeTeam : awayTeam;
          
          // Parse scores from summary
          const homeScore = parseInt(homeTeam?.score) || 0;
          const awayScore = parseInt(awayTeam?.score) || 0;
          const teamScore = isHome ? homeScore : awayScore;
          const opponentScore = isHome ? awayScore : homeScore;
          
          // Determine status
          let status = 'upcoming';
          const statusType = competition.status?.type;
          if (statusType?.completed || statusType?.name === 'STATUS_FINAL') {
            status = 'final';
          } else if (statusType?.state === 'in') {
            status = 'live';
          }
          
          // Winner from API
          const won = status === 'final' ? ourTeam?.winner === true : null;
          
          const opponentId = opponent?.id || opponent?.team?.id;
          
          return {
            id: event.id,
            opponent: opponent?.team?.displayName || opponent?.team?.name || 'TBD',
            opponent_id: opponentId,
            opponent_logo: opponent?.team?.logos?.[0]?.href || (opponentId ? `https://a.espncdn.com/i/teamlogos/ncaa/500/${opponentId}.png` : null),
            opponent_abbrev: opponent?.team?.abbreviation,
            opponent_rank: opponent?.rank || (opponent?.curatedRank?.current <= 25 ? opponent?.curatedRank?.current : null),
            date: event.date,
            game_date: event.date ? new Date(event.date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            }) : 'TBD',
            time: event.date ? new Date(event.date).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            }) : 'TBD',
            is_home: isHome,
            tv_network: competition.broadcasts?.[0]?.media?.shortName,
            status,
            result: status === 'final' ? {
              team_score: teamScore,
              opponent_score: opponentScore,
              won: won
            } : null,
            week: event.week?.number || summaryData.header?.week || idx + 1,
          };
        } catch (err) {
          console.error(`Error fetching game ${event.id}:`, err);
          return parseScheduleEvent(event, requestedTeamId, idx);
        }
      })
    );
    
    return gamesWithScores.filter(Boolean);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return [];
  }
}

// Helper to parse schedule event when summary fetch fails
function parseScheduleEvent(event, requestedTeamId, idx) {
  const name = event.name || '';
  const isHome = name.includes(' at ') ? !name.startsWith('Miami') : name.includes(' vs ');
  
  // Try to extract opponent id from the event
  const competitors = event.competitions?.[0]?.competitors || [];
  const opponent = competitors.find(c => String(c.id) !== requestedTeamId);
  const opponentId = opponent?.id;
  
  return {
    id: event.id,
    opponent: opponent?.team?.displayName || event.shortName?.replace(/^(MIA @ |@ MIA|MIA vs |vs MIA)/, '').trim() || 'TBD',
    opponent_id: opponentId,
    opponent_logo: opponentId ? `https://a.espncdn.com/i/teamlogos/ncaa/500/${opponentId}.png` : null,
    opponent_abbrev: opponent?.team?.abbreviation || null,
    opponent_rank: null,
    date: event.date,
    game_date: event.date ? new Date(event.date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }) : 'TBD',
    time: event.date ? new Date(event.date).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    }) : 'TBD',
    is_home: isHome,
    tv_network: null,
    status: 'upcoming',
    result: null,
    week: event.week?.number || idx + 1,
  };
}

// Fetch top 25 rankings
export async function fetchRankings() {
  try {
    const response = await fetch(`${ESPN_BASE}/rankings`);
    if (!response.ok) throw new Error('Failed to fetch rankings');
    const data = await response.json();
    
    // Try AP Poll first, then CFP, then any available
    const apPoll = data.rankings?.find(r => r.name?.includes('AP Top 25')) 
      || data.rankings?.find(r => r.name?.includes('CFP'))
      || data.rankings?.[0];
    
    return apPoll?.ranks?.map(rank => ({
      rank: rank.current,
      previous_rank: rank.previous,
      team: rank.team?.displayName || rank.team?.name,
      team_id: rank.team?.id,
      logo: rank.team?.logo,
      record: rank.recordSummary,
      points: rank.points,
      trend: rank.current < rank.previous ? 'up' : rank.current > rank.previous ? 'down' : 'same',
    })) || [];
  } catch (error) {
    console.error('Error fetching rankings:', error);
    return [];
  }
}

// Fetch news/headlines
export async function fetchNews(limit = 20) {
  try {
    const response = await fetch(`${ESPN_BASE}/news?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch news');
    const data = await response.json();
    
    return data.articles?.map(article => ({
      id: article.dataSourceIdentifier,
      headline: article.headline,
      description: article.description,
      image: article.images?.[0]?.url,
      link: article.links?.web?.href || article.links?.mobile?.href,
      published: article.published,
      source: 'ESPN',
    })) || [];
  } catch (error) {
    console.error('Error fetching news:', error);
    return [];
  }
}

// Fetch team-specific news
export async function fetchTeamNews(teamId, limit = 10) {
  try {
    const response = await fetch(`${ESPN_BASE}/news?team=${teamId}&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch team news');
    const data = await response.json();
    
    return data.articles?.map(article => ({
      id: article.dataSourceIdentifier || article.id,
      headline: article.headline,
      description: article.description,
      image: article.images?.[0]?.url,
      link: article.links?.web?.href || article.links?.mobile?.href,
      published: article.published,
      publishedFormatted: article.published 
        ? new Date(article.published).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })
        : null,
      source: 'ESPN',
    })) || [];
  } catch (error) {
    console.error('Error fetching team news:', error);
    return [];
  }
}

// Fetch team info
export async function fetchTeamInfo(teamId) {
  try {
    const response = await fetch(`${ESPN_BASE}/teams/${teamId}`);
    if (!response.ok) throw new Error('Failed to fetch team');
    const data = await response.json();
    
    const team = data.team;
    return {
      id: team.id,
      name: team.displayName,
      abbreviation: team.abbreviation,
      nickname: team.nickname,
      logo: team.logos?.[0]?.href,
      color: team.color,
      record: team.record?.items?.[0]?.summary,
      standing: team.standingSummary,
      location: team.location,
      conference: team.groups?.parent?.name,
    };
  } catch (error) {
    console.error('Error fetching team:', error);
    return null;
  }
}

// Fetch all teams
export async function fetchAllTeams() {
  try {
    const response = await fetch(`${ESPN_BASE}/teams?limit=200`);
    if (!response.ok) throw new Error('Failed to fetch teams');
    const data = await response.json();
    
    return data.sports?.[0]?.leagues?.[0]?.teams?.map(t => ({
      id: t.team.id,
      name: t.team.displayName,
      abbreviation: t.team.abbreviation,
      logo: t.team.logos?.[0]?.href,
      color: t.team.color,
    })) || [];
  } catch (error) {
    console.error('Error fetching all teams:', error);
    return [];
  }
}

// Search teams
export async function searchTeams(query) {
  try {
    const response = await fetch(`${ESPN_BASE}/teams?limit=200`);
    if (!response.ok) throw new Error('Failed to fetch teams');
    const data = await response.json();
    
    const allTeams = data.sports?.[0]?.leagues?.[0]?.teams?.map(t => t.team) || [];
    
    if (!query) return allTeams.slice(0, 25);
    
    const lowerQuery = query.toLowerCase();
    return allTeams.filter(team => 
      team.displayName?.toLowerCase().includes(lowerQuery) ||
      team.name?.toLowerCase().includes(lowerQuery) ||
      team.abbreviation?.toLowerCase().includes(lowerQuery) ||
      team.nickname?.toLowerCase().includes(lowerQuery)
    );
  } catch (error) {
    console.error('Error searching teams:', error);
    return [];
  }
}

// Fetch standings
export async function fetchStandings() {
  try {
    const response = await fetch(`${ESPN_BASE}/standings`);
    if (!response.ok) throw new Error('Failed to fetch standings');
    const data = await response.json();
    
    return data.children?.map(conference => ({
      name: conference.name,
      abbreviation: conference.abbreviation,
      teams: conference.standings?.entries?.map(entry => ({
        team: entry.team?.displayName,
        team_id: entry.team?.id,
        logo: entry.team?.logos?.[0]?.href,
        overall_record: entry.stats?.find(s => s.name === 'overall')?.displayValue,
        conference_record: entry.stats?.find(s => s.name === 'vs. Conf.')?.displayValue || entry.stats?.find(s => s.name === 'leagueRecord')?.displayValue,
        wins: entry.stats?.find(s => s.name === 'wins')?.value,
        losses: entry.stats?.find(s => s.name === 'losses')?.value,
      })) || [],
    })) || [];
  } catch (error) {
    console.error('Error fetching standings:', error);
    return [];
  }
}

// Popular teams for quick selection
export const CONFERENCES = [
  { id: 'sec', name: 'SEC', color: '#004C8C' },
  { id: 'big10', name: 'Big Ten', color: '#0033A0' },
  { id: 'big12', name: 'Big 12', color: '#004680' },
  { id: 'acc', name: 'ACC', color: '#003865' },
  { id: 'mwc', name: 'Mountain West', color: '#003057' },
  { id: 'ind', name: 'Independent', color: '#0C2340' },
];

// Correct ESPN Team IDs - verified from ESPN API
export const POPULAR_TEAMS = [
  // SEC (16 teams)
  { id: '333', name: 'Alabama Crimson Tide', abbreviation: 'ALA', conference: 'SEC' },
  { id: '57', name: 'Auburn Tigers', abbreviation: 'AUB', conference: 'SEC' },
  { id: '8', name: 'Arkansas Razorbacks', abbreviation: 'ARK', conference: 'SEC' },
  { id: '57', name: 'Florida Gators', abbreviation: 'FLA', conference: 'SEC' },
  { id: '61', name: 'Georgia Bulldogs', abbreviation: 'UGA', conference: 'SEC' },
  { id: '96', name: 'Kentucky Wildcats', abbreviation: 'UK', conference: 'SEC' },
  { id: '99', name: 'LSU Tigers', abbreviation: 'LSU', conference: 'SEC' },
  { id: '145', name: 'Ole Miss Rebels', abbreviation: 'MISS', conference: 'SEC' },
  { id: '344', name: 'Mississippi State Bulldogs', abbreviation: 'MSST', conference: 'SEC' },
  { id: '142', name: 'Missouri Tigers', abbreviation: 'MIZ', conference: 'SEC' },
  { id: '201', name: 'Oklahoma Sooners', abbreviation: 'OU', conference: 'SEC' },
  { id: '2579', name: 'South Carolina Gamecocks', abbreviation: 'SC', conference: 'SEC' },
  { id: '2633', name: 'Tennessee Volunteers', abbreviation: 'TENN', conference: 'SEC' },
  { id: '251', name: 'Texas Longhorns', abbreviation: 'TEX', conference: 'SEC' },
  { id: '245', name: 'Texas A&M Aggies', abbreviation: 'TAMU', conference: 'SEC' },
  { id: '238', name: 'Vanderbilt Commodores', abbreviation: 'VAN', conference: 'SEC' },
  
  // Big Ten (18 teams)
  { id: '356', name: 'Illinois Fighting Illini', abbreviation: 'ILL', conference: 'Big Ten' },
  { id: '84', name: 'Indiana Hoosiers', abbreviation: 'IND', conference: 'Big Ten' },
  { id: '2294', name: 'Iowa Hawkeyes', abbreviation: 'IOWA', conference: 'Big Ten' },
  { id: '276', name: 'Maryland Terrapins', abbreviation: 'MD', conference: 'Big Ten' },
  { id: '130', name: 'Michigan Wolverines', abbreviation: 'MICH', conference: 'Big Ten' },
  { id: '127', name: 'Michigan State Spartans', abbreviation: 'MSU', conference: 'Big Ten' },
  { id: '135', name: 'Minnesota Golden Gophers', abbreviation: 'MINN', conference: 'Big Ten' },
  { id: '158', name: 'Nebraska Cornhuskers', abbreviation: 'NEB', conference: 'Big Ten' },
  { id: '77', name: 'Northwestern Wildcats', abbreviation: 'NW', conference: 'Big Ten' },
  { id: '194', name: 'Ohio State Buckeyes', abbreviation: 'OSU', conference: 'Big Ten' },
  { id: '2509', name: 'Oregon Ducks', abbreviation: 'ORE', conference: 'Big Ten' },
  { id: '213', name: 'Penn State Nittany Lions', abbreviation: 'PSU', conference: 'Big Ten' },
  { id: '2509', name: 'Purdue Boilermakers', abbreviation: 'PUR', conference: 'Big Ten' },
  { id: '164', name: 'Rutgers Scarlet Knights', abbreviation: 'RUT', conference: 'Big Ten' },
  { id: '26', name: 'UCLA Bruins', abbreviation: 'UCLA', conference: 'Big Ten' },
  { id: '30', name: 'USC Trojans', abbreviation: 'USC', conference: 'Big Ten' },
  { id: '264', name: 'Washington Huskies', abbreviation: 'WASH', conference: 'Big Ten' },
  { id: '275', name: 'Wisconsin Badgers', abbreviation: 'WIS', conference: 'Big Ten' },
  
  // Big 12 (16 teams)
  { id: '12', name: 'Arizona Wildcats', abbreviation: 'ARIZ', conference: 'Big 12' },
  { id: '9', name: 'Arizona State Sun Devils', abbreviation: 'ASU', conference: 'Big 12' },
  { id: '239', name: 'Baylor Bears', abbreviation: 'BAY', conference: 'Big 12' },
  { id: '252', name: 'BYU Cougars', abbreviation: 'BYU', conference: 'Big 12' },
  { id: '2132', name: 'Cincinnati Bearcats', abbreviation: 'CIN', conference: 'Big 12' },
  { id: '38', name: 'Colorado Buffaloes', abbreviation: 'COLO', conference: 'Big 12' },
  { id: '248', name: 'Houston Cougars', abbreviation: 'HOU', conference: 'Big 12' },
  { id: '2306', name: 'Iowa State Cyclones', abbreviation: 'ISU', conference: 'Big 12' },
  { id: '2305', name: 'Kansas Jayhawks', abbreviation: 'KU', conference: 'Big 12' },
  { id: '2306', name: 'Kansas State Wildcats', abbreviation: 'KSU', conference: 'Big 12' },
  { id: '197', name: 'Oklahoma State Cowboys', abbreviation: 'OKST', conference: 'Big 12' },
  { id: '2641', name: 'TCU Horned Frogs', abbreviation: 'TCU', conference: 'Big 12' },
  { id: '2628', name: 'Texas Tech Red Raiders', abbreviation: 'TTU', conference: 'Big 12' },
  { id: '2638', name: 'UCF Knights', abbreviation: 'UCF', conference: 'Big 12' },
  { id: '254', name: 'Utah Utes', abbreviation: 'UTAH', conference: 'Big 12' },
  { id: '277', name: 'West Virginia Mountaineers', abbreviation: 'WVU', conference: 'Big 12' },
  
  // ACC (17 teams)
  { id: '103', name: 'Boston College Eagles', abbreviation: 'BC', conference: 'ACC' },
  { id: '25', name: 'California Golden Bears', abbreviation: 'CAL', conference: 'ACC' },
  { id: '228', name: 'Clemson Tigers', abbreviation: 'CLEM', conference: 'ACC' },
  { id: '150', name: 'Duke Blue Devils', abbreviation: 'DUKE', conference: 'ACC' },
  { id: '52', name: 'Florida State Seminoles', abbreviation: 'FSU', conference: 'ACC' },
  { id: '59', name: 'Georgia Tech Yellow Jackets', abbreviation: 'GT', conference: 'ACC' },
  { id: '97', name: 'Louisville Cardinals', abbreviation: 'LOU', conference: 'ACC' },
  { id: '2390', name: 'Miami Hurricanes', abbreviation: 'MIA', conference: 'ACC' },
  { id: '152', name: 'NC State Wolfpack', abbreviation: 'NCSU', conference: 'ACC' },
  { id: '153', name: 'North Carolina Tar Heels', abbreviation: 'UNC', conference: 'ACC' },
  { id: '221', name: 'Pittsburgh Panthers', abbreviation: 'PITT', conference: 'ACC' },
  { id: '2507', name: 'SMU Mustangs', abbreviation: 'SMU', conference: 'ACC' },
  { id: '24', name: 'Stanford Cardinal', abbreviation: 'STAN', conference: 'ACC' },
  { id: '183', name: 'Syracuse Orange', abbreviation: 'SYR', conference: 'ACC' },
  { id: '258', name: 'Virginia Cavaliers', abbreviation: 'UVA', conference: 'ACC' },
  { id: '259', name: 'Virginia Tech Hokies', abbreviation: 'VT', conference: 'ACC' },
  { id: '154', name: 'Wake Forest Demon Deacons', abbreviation: 'WAKE', conference: 'ACC' },
  
  // Mountain West (12 teams)
  { id: '2005', name: 'Air Force Falcons', abbreviation: 'AF', conference: 'Mountain West' },
  { id: '68', name: 'Boise State Broncos', abbreviation: 'BSU', conference: 'Mountain West' },
  { id: '36', name: 'Colorado State Rams', abbreviation: 'CSU', conference: 'Mountain West' },
  { id: '278', name: 'Fresno State Bulldogs', abbreviation: 'FRES', conference: 'Mountain West' },
  { id: '62', name: 'Hawaii Rainbow Warriors', abbreviation: 'HAW', conference: 'Mountain West' },
  { id: '2426', name: 'Nevada Wolf Pack', abbreviation: 'NEV', conference: 'Mountain West' },
  { id: '167', name: 'New Mexico Lobos', abbreviation: 'UNM', conference: 'Mountain West' },
  { id: '21', name: 'San Diego State Aztecs', abbreviation: 'SDSU', conference: 'Mountain West' },
  { id: '23', name: 'San Jose State Spartans', abbreviation: 'SJSU', conference: 'Mountain West' },
  { id: '2638', name: 'UNLV Rebels', abbreviation: 'UNLV', conference: 'Mountain West' },
  { id: '328', name: 'Utah State Aggies', abbreviation: 'USU', conference: 'Mountain West' },
  { id: '2704', name: 'Wyoming Cowboys', abbreviation: 'WYO', conference: 'Mountain West' },
  
  // Independent (5 teams)
  { id: '87', name: 'Notre Dame Fighting Irish', abbreviation: 'ND', conference: 'Independent' },
  { id: '349', name: 'Army Black Knights', abbreviation: 'ARMY', conference: 'Independent' },
  { id: '2426', name: 'Navy Midshipmen', abbreviation: 'NAVY', conference: 'Independent' },
  { id: '41', name: 'UConn Huskies', abbreviation: 'CONN', conference: 'Independent' },
  { id: '113', name: 'UMass Minutemen', abbreviation: 'UMASS', conference: 'Independent' },
];

// Season weeks for the 2024 season (regular season)
export const SEASON_WEEKS_2024 = [
  { week: 0, label: 'Week 0 (Aug 24)', seasonType: 2, startDate: '2024-08-24', endDate: '2024-08-26' },
  { week: 1, label: 'Week 1 (Aug 29-Sep 2)', seasonType: 2, startDate: '2024-08-29', endDate: '2024-09-02' },
  { week: 2, label: 'Week 2 (Sep 5-9)', seasonType: 2, startDate: '2024-09-05', endDate: '2024-09-09' },
  { week: 3, label: 'Week 3 (Sep 12-16)', seasonType: 2, startDate: '2024-09-12', endDate: '2024-09-16' },
  { week: 4, label: 'Week 4 (Sep 19-23)', seasonType: 2, startDate: '2024-09-19', endDate: '2024-09-23' },
  { week: 5, label: 'Week 5 (Sep 26-30)', seasonType: 2, startDate: '2024-09-26', endDate: '2024-09-30' },
  { week: 6, label: 'Week 6 (Oct 3-7)', seasonType: 2, startDate: '2024-10-03', endDate: '2024-10-07' },
  { week: 7, label: 'Week 7 (Oct 10-14)', seasonType: 2, startDate: '2024-10-10', endDate: '2024-10-14' },
  { week: 8, label: 'Week 8 (Oct 17-21)', seasonType: 2, startDate: '2024-10-17', endDate: '2024-10-21' },
  { week: 9, label: 'Week 9 (Oct 24-28)', seasonType: 2, startDate: '2024-10-24', endDate: '2024-10-28' },
  { week: 10, label: 'Week 10 (Oct 31-Nov 4)', seasonType: 2, startDate: '2024-10-31', endDate: '2024-11-04' },
  { week: 11, label: 'Week 11 (Nov 7-11)', seasonType: 2, startDate: '2024-11-07', endDate: '2024-11-11' },
  { week: 12, label: 'Week 12 (Nov 14-18)', seasonType: 2, startDate: '2024-11-14', endDate: '2024-11-18' },
  { week: 13, label: 'Week 13 (Nov 21-25)', seasonType: 2, startDate: '2024-11-21', endDate: '2024-11-25' },
  { week: 14, label: 'Week 14 (Nov 28-Dec 2)', seasonType: 2, startDate: '2024-11-28', endDate: '2024-12-02' },
  { week: 15, label: 'Conference Championships', seasonType: 2, startDate: '2024-12-05', endDate: '2024-12-09' },
  { week: 16, label: 'Army vs Navy', seasonType: 2, startDate: '2024-12-14', endDate: '2024-12-14' },
];

// Bowl season / playoffs - 2024-25 CFP Schedule
export const POSTSEASON_WEEKS = [
  { week: 1, label: 'CFP First Round (Dec 20-21)', seasonType: 3, startDate: '2024-12-20', endDate: '2024-12-21' },
  { week: 2, label: 'Bowl Games (Dec 17-27)', seasonType: 3, startDate: '2024-12-17', endDate: '2024-12-27' },
  { week: 3, label: 'CFP Quarterfinals (Dec 31-Jan 1)', seasonType: 3, startDate: '2024-12-31', endDate: '2025-01-01' },
  { week: 4, label: 'Bowl Games (Jan 2-4)', seasonType: 3, startDate: '2025-01-02', endDate: '2025-01-04' },
  { week: 5, label: 'CFP Semifinals (Jan 9-10)', seasonType: 3, startDate: '2025-01-09', endDate: '2025-01-10' },
  { week: 6, label: 'National Championship (Jan 20)', seasonType: 3, startDate: '2025-01-20', endDate: '2025-01-20' },
];

// Combined weeks
export const SEASON_WEEKS = [...SEASON_WEEKS_2024, ...POSTSEASON_WEEKS];

// Fetch play-by-play data for a specific game
export async function fetchPlayByPlay(gameId) {
  try {
    const response = await fetch(
      `${ESPN_BASE}/summary?event=${gameId}`
    );
    if (!response.ok) throw new Error('Failed to fetch play-by-play');
    const data = await response.json();
    
    // Parse drives and plays
    const drives = data.drives?.previous || [];
    const currentDrive = data.drives?.current;
    const situation = data.situation || data.header?.competitions?.[0]?.situation;
    
    // Flatten all plays from drives
    const allPlays = [];
    
    drives.forEach(drive => {
      if (drive.plays) {
        drive.plays.forEach(play => {
          allPlays.push({
            id: play.id,
            quarter: play.period?.number || 1,
            time: play.clock?.displayValue || '',
            down: play.start?.down,
            distance: play.start?.distance,
            yard_line: play.start?.yardLine ? `${play.start?.team?.abbreviation || ''} ${play.start?.yardLine}` : null,
            description: play.text || play.description || '',
            result: play.statYardage ? `${play.statYardage > 0 ? '+' : ''}${play.statYardage} yards` : '',
            yards: play.statYardage || 0,
            team: play.start?.team?.abbreviation || drive.team?.abbreviation,
            is_scoring: play.scoringPlay || play.scoreValue > 0,
            is_turnover: play.type?.text?.toLowerCase().includes('interception') || 
                        play.type?.text?.toLowerCase().includes('fumble'),
            is_key_play: play.statYardage >= 20 || play.scoringPlay,
            play_type: play.type?.text || play.type?.abbreviation,
          });
        });
      }
    });
    
    // Add current drive plays
    if (currentDrive?.plays) {
      currentDrive.plays.forEach(play => {
        allPlays.push({
          id: play.id,
          quarter: play.period?.number || situation?.period || 1,
          time: play.clock?.displayValue || '',
          down: play.start?.down,
          distance: play.start?.distance,
          yard_line: play.start?.yardLine ? `${play.start?.team?.abbreviation || ''} ${play.start?.yardLine}` : null,
          description: play.text || play.description || '',
          result: play.statYardage ? `${play.statYardage > 0 ? '+' : ''}${play.statYardage} yards` : '',
          yards: play.statYardage || 0,
          team: play.start?.team?.abbreviation || currentDrive.team?.abbreviation,
          is_scoring: play.scoringPlay || play.scoreValue > 0,
          is_turnover: play.type?.text?.toLowerCase().includes('interception') || 
                      play.type?.text?.toLowerCase().includes('fumble'),
          is_key_play: play.statYardage >= 20 || play.scoringPlay,
          play_type: play.type?.text || play.type?.abbreviation,
        });
      });
    }
    
    // Sort plays by most recent first
    allPlays.reverse();
    
    return {
      plays: allPlays.slice(0, 50), // Limit to 50 most recent plays
      current_drive: currentDrive ? {
        description: currentDrive.description,
        team: currentDrive.team?.abbreviation,
        plays_count: currentDrive.plays?.length || 0,
        yards: currentDrive.yards,
        start_yard_line: currentDrive.start?.yardLine,
        possession_text: currentDrive.displayResult || `${currentDrive.team?.abbreviation || 'Team'} ball`,
      } : null,
      game_situation: situation ? {
        down: situation.down,
        distance: situation.distance,
        yard_line: situation.yardLine,
        possession_team: situation.possession || situation.team?.abbreviation,
        is_red_zone: situation.isRedZone,
        period: situation.period,
        clock: situation.clock?.displayValue,
      } : null,
    };
  } catch (error) {
    console.error('Error fetching play-by-play:', error);
    return { plays: [], current_drive: null, game_situation: null };
  }
}

// Fetch live game stats for a specific game
export async function fetchLiveGameStats(gameId) {
  try {
    const response = await fetch(
      `${ESPN_BASE}/summary?event=${gameId}`
    );
    if (!response.ok) throw new Error('Failed to fetch game stats');
    const data = await response.json();
    
    const boxscore = data.boxscore;
    const header = data.header;
    
    if (!boxscore) {
      return { home: {}, away: {}, comparison: [] };
    }
    
    // Get team info from header
    const competition = header?.competitions?.[0];
    const homeTeam = competition?.competitors?.find(c => c.homeAway === 'home');
    const awayTeam = competition?.competitors?.find(c => c.homeAway === 'away');
    
    // Parse team stats
    const parseTeamStats = (stats) => {
      const result = {};
      if (!stats) return result;
      
      stats.forEach(stat => {
        const key = stat.name || stat.label;
        const value = stat.displayValue || stat.value;
        result[key.toLowerCase().replace(/\s+/g, '_')] = value;
      });
      
      return result;
    };
    
    // Get stats for each team
    const teams = boxscore.teams || [];
    const homeStats = teams.find(t => t.team?.id === homeTeam?.id)?.statistics || [];
    const awayStats = teams.find(t => t.team?.id === awayTeam?.id)?.statistics || [];
    
    // Build comparison stats
    const comparison = [];
    const statCategories = [
      { key: 'totalYards', label: 'Total Yards' },
      { key: 'passingYards', label: 'Passing Yards' },
      { key: 'rushingYards', label: 'Rushing Yards' },
      { key: 'turnovers', label: 'Turnovers' },
      { key: 'firstDowns', label: 'First Downs' },
      { key: 'thirdDownEff', label: '3rd Down Eff' },
      { key: 'possessionTime', label: 'Possession' },
      { key: 'penalties', label: 'Penalties' },
    ];
    
    statCategories.forEach(cat => {
      const homeStat = homeStats.find(s => s.name === cat.key || s.label === cat.key);
      const awayStat = awayStats.find(s => s.name === cat.key || s.label === cat.key);
      
      if (homeStat || awayStat) {
        comparison.push({
          label: cat.label,
          home_value: homeStat?.displayValue || '0',
          away_value: awayStat?.displayValue || '0',
          home_raw: parseFloat(homeStat?.value) || 0,
          away_raw: parseFloat(awayStat?.value) || 0,
        });
      }
    });
    
    // Parse player stats
    const parsePlayers = (playerStats) => {
      if (!playerStats) return {};
      
      const result = {};
      playerStats.forEach(category => {
        const categoryName = category.name || category.displayName;
        result[categoryName?.toLowerCase()] = category.athletes?.map(athlete => ({
          name: athlete.athlete?.displayName || athlete.athlete?.shortName,
          position: athlete.athlete?.position?.abbreviation,
          stats: athlete.stats?.join(', ') || '',
          statLabels: category.labels || [],
        })) || [];
      });
      
      return result;
    };
    
    const homePlayers = boxscore.players?.find(p => p.team?.id === homeTeam?.id);
    const awayPlayers = boxscore.players?.find(p => p.team?.id === awayTeam?.id);
    
    return {
      home: {
        team: homeTeam?.team?.displayName || homeTeam?.team?.name,
        abbreviation: homeTeam?.team?.abbreviation,
        logo: homeTeam?.team?.logo,
        score: homeTeam?.score,
        stats: parseTeamStats(homeStats),
        players: parsePlayers(homePlayers?.statistics),
      },
      away: {
        team: awayTeam?.team?.displayName || awayTeam?.team?.name,
        abbreviation: awayTeam?.team?.abbreviation,
        logo: awayTeam?.team?.logo,
        score: awayTeam?.score,
        stats: parseTeamStats(awayStats),
        players: parsePlayers(awayPlayers?.statistics),
      },
      comparison,
    };
  } catch (error) {
    console.error('Error fetching game stats:', error);
    return { home: {}, away: {}, comparison: [] };
  }
}

// Fetch game summary (includes score, status, and basic info)
export async function fetchGameSummary(gameId) {
  try {
    const response = await fetch(
      `${ESPN_BASE}/summary?event=${gameId}`
    );
    if (!response.ok) throw new Error('Failed to fetch game summary');
    const data = await response.json();
    
    const header = data.header;
    const competition = header?.competitions?.[0];
    const situation = data.situation || competition?.situation;
    
    const homeTeam = competition?.competitors?.find(c => c.homeAway === 'home');
    const awayTeam = competition?.competitors?.find(c => c.homeAway === 'away');
    
    return {
      id: header?.id,
      status: competition?.status?.type?.state,
      status_detail: competition?.status?.type?.detail,
      period: competition?.status?.period,
      clock: competition?.status?.displayClock,
      home: {
        name: homeTeam?.team?.displayName,
        abbreviation: homeTeam?.team?.abbreviation,
        logo: homeTeam?.team?.logo,
        score: parseInt(homeTeam?.score) || 0,
        rank: homeTeam?.rank,
      },
      away: {
        name: awayTeam?.team?.displayName,
        abbreviation: awayTeam?.team?.abbreviation,
        logo: awayTeam?.team?.logo,
        score: parseInt(awayTeam?.score) || 0,
        rank: awayTeam?.rank,
      },
      situation: situation ? {
        down: situation.down,
        distance: situation.distance,
        possession: situation.possession,
        yard_line: situation.yardLine,
        is_red_zone: situation.isRedZone,
      } : null,
      venue: competition?.venue?.fullName,
      broadcasts: competition?.broadcasts?.map(b => b.names?.join(', ')),
    };
  } catch (error) {
    console.error('Error fetching game summary:', error);
    return null;
  }
}

// Export configuration
export { REFRESH_INTERVAL };

export default {
  fetchScoreboard,
  fetchScoreboardByDate,
  fetchWeekByNumber,
  fetchGamesForCalendarEntry,
  fetchGamesByDateRange,
  fetchSeasonGames,
  fetchSeasonCalendar,
  fetchTeamSchedule,
  fetchRankings,
  fetchNews,
  fetchTeamNews,
  fetchTeamInfo,
  fetchAllTeams,
  searchTeams,
  fetchStandings,
  fetchPlayByPlay,
  fetchLiveGameStats,
  fetchGameSummary,
  getCurrentSeason,
  POPULAR_TEAMS,
  SEASON_WEEKS,
  SEASON_WEEKS_2024,
  POSTSEASON_WEEKS,
  REFRESH_INTERVAL,
};
