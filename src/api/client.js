// Standalone app client facade (no external BaaS).
// Centralizes access to local auth/storage and sports data "functions".

import { auth } from '@/lib/auth';
import { isCloudEnabled } from '@/lib/supabase';
import { uploadPhoto } from '@/lib/cloudEntities';
import {
  Game,
  Tailgate,
  TailgateGroup,
  CarLocation,
  FriendLocation,
  School,
  UserLocation,
  ParkedCar,
  Prediction,
  TeamPost,
  TeamComment,
  Notification,
} from '@/lib/dataService';

import {
  fetchScoreboard,
  fetchStandings,
  fetchNews,
} from '@/lib/sportsApi';

function safeObjectUrl(file) {
  try {
    if (file instanceof Blob) return URL.createObjectURL(file);
  } catch {
    // ignore
  }
  return null;
}

export const client = {
  auth,
  entities: {
    Game,
    Tailgate,
    TailgateGroup,
    CarLocation,
    FriendLocation,
    School,
    UserLocation,
    ParkedCar,
    Prediction,
    TeamPost,
    TeamComment,
    Notification,
  },
  // "integrations" are local stubs to keep UX working without a backend.
  integrations: {
    Core: {
      UploadFile: async ({ file }) => {
        // Cloud: real upload so other users/devices can see the photo
        if (isCloudEnabled()) return { file_url: await uploadPhoto(file) };
        const file_url = safeObjectUrl(file);
        if (!file_url) throw new Error('UploadFile failed (unsupported file type)');
        return { file_url };
      },
      SendEmail: async () => {
        // No-op in standalone mode.
        return { ok: true };
      },
    },
  },
  // "functions" map old serverless calls to ESPN/public endpoints.
  functions: {
    invoke: async (name, params = {}) => {
      switch (name) {
        case 'fetchLiveScores': {
          const games = await fetchScoreboard();
          return { data: { games } };
        }
        case 'fetchStandings': {
          const standings = await fetchStandings();
          return { data: { standings } };
        }
        case 'fetchTeamStats': {
          // Not implemented - return empty stats
          return { data: { stats: {} } };
        }
        case 'fetchHeadToHead': {
          // Not implemented - return empty h2h
          return { data: { head_to_head: {} } };
        }
        case 'fetchTeamNews': {
          // params: { team_name }
          const articles = await fetchNews(20);
          return { data: { news: articles } };
        }
        case 'fetchPlayByPlay':
        case 'fetchLiveGameStats':
        case 'createNotifications': {
          // Not implemented in standalone mode; return safe empty payloads.
          return { data: {} };
        }
        default:
          throw new Error(`Unknown function: ${name}`);
      }
    },
  },
};

export default client;


