// Data Service for GameDay
// Provides a unified API for all data operations using local storage

import { entities, generateId } from './localStorage';

// Wrapper to make entity methods return Promises (for React Query compatibility)
function promisify(fn) {
  return (...args) => {
    return new Promise((resolve, reject) => {
      try {
        const result = fn(...args);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  };
}

// Create entity wrapper with Promise-based methods
function createEntityWrapper(entity) {
  return {
    list: promisify(() => entity.getAll()),
    get: promisify((id) => entity.get(id)),
    create: promisify((data) => entity.create(data)),
    update: promisify((id, data) => entity.update(id, data)),
    delete: promisify((id) => entity.delete(id)),
    filter: promisify((conditions, sortBy, limit) => entity.filter(conditions, sortBy, limit)),
  };
}

// Export entity wrappers
export const Game = createEntityWrapper(entities.Game);
export const Tailgate = createEntityWrapper(entities.Tailgate);
export const TailgateGroup = createEntityWrapper(entities.TailgateGroup);
export const CarLocation = createEntityWrapper(entities.CarLocation);
export const FriendLocation = createEntityWrapper(entities.FriendLocation);
export const Prediction = createEntityWrapper(entities.Prediction);
export const TeamPost = createEntityWrapper(entities.TeamPost);
export const TeamComment = createEntityWrapper(entities.TeamComment);
export const Notification = createEntityWrapper(entities.Notification);
export const School = createEntityWrapper(entities.School);
export const UserLocation = createEntityWrapper(entities.UserLocation);
export const ParkedCar = createEntityWrapper(entities.ParkedCar);

// Sample data is dated relative to today (upcoming Saturdays) so the demo
// content never shows as stale/past. Returns a local YYYY-MM-DD string.
function upcomingSaturday(weeksAhead = 0) {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7) + weeksAhead * 7);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Initialize with sample data if empty
export function initializeSampleData() {
  // Sample Games
  if (entities.Game.getAll().length === 0) {
    const sampleGames = [
      {
        opponent: 'Georgia Bulldogs',
        date: upcomingSaturday(0),
        time: '3:30 PM',
        location: 'Home',
        tv_network: 'CBS',
        status: 'upcoming',
        is_home_game: true,
      },
      {
        opponent: 'LSU Tigers',
        date: upcomingSaturday(1),
        time: '7:00 PM',
        location: 'Away',
        tv_network: 'ESPN',
        status: 'upcoming',
        is_home_game: false,
      },
      {
        opponent: 'Tennessee Volunteers',
        date: upcomingSaturday(2),
        time: '12:00 PM',
        location: 'Home',
        tv_network: 'ABC',
        status: 'upcoming',
        is_home_game: true,
      },
      {
        opponent: 'Auburn Tigers',
        date: upcomingSaturday(3),
        time: '3:30 PM',
        location: 'Home',
        tv_network: 'CBS',
        status: 'upcoming',
        is_home_game: true,
      },
      {
        opponent: 'Texas A&M Aggies',
        date: upcomingSaturday(4),
        time: '7:00 PM',
        location: 'Away',
        tv_network: 'ESPN',
        status: 'upcoming',
        is_home_game: false,
      },
    ];
    
    sampleGames.forEach(game => entities.Game.create(game));
  }
  
  // Sample Tailgates
  if (entities.Tailgate.getAll().length === 0) {
    const sampleTailgates = [
      {
        name: "The Quad Squad Tailgate",
        description: "Join us for the ultimate pre-game party! We've got BBQ, cold drinks, and great company. All fans welcome!",
        host_name: "John Smith",
        host_email: "demo@gameday.app",
        game_date: upcomingSaturday(0),
        start_time: '10:00 AM',
        end_time: '2:30 PM',
        location: {
          lat: 33.2084,
          lng: -87.5503,
          lot_name: 'Quad Area',
        },
        is_public: true,
        rsvp_count: 24,
        amenities: ['Food', 'Drinks', 'Games', 'TV'],
      },
      {
        name: "Crimson Tide Cookout",
        description: "Best burgers in town! Family friendly atmosphere with games for kids.",
        host_name: "Mike Johnson",
        host_email: "mike@gameday.app",
        game_date: upcomingSaturday(0),
        start_time: '9:00 AM',
        end_time: '2:00 PM',
        location: {
          lat: 33.2094,
          lng: -87.5523,
          lot_name: 'Lot 10',
        },
        is_public: true,
        rsvp_count: 18,
        amenities: ['Food', 'Drinks', 'Family Friendly'],
      },
      {
        name: "Roll Tide Rally",
        description: "Get hyped for the big game! Live music, face painting, and more!",
        host_name: "Sarah Davis",
        host_email: "sarah@gameday.app",
        game_date: upcomingSaturday(1),
        start_time: '4:00 PM',
        end_time: '6:30 PM',
        location: {
          lat: 33.2104,
          lng: -87.5483,
          lot_name: 'North End Zone',
        },
        is_public: true,
        rsvp_count: 35,
        amenities: ['Live Music', 'Drinks', 'Games'],
      },
    ];
    
    sampleTailgates.forEach(tailgate => entities.Tailgate.create(tailgate));
  }

  // Sample Schools (for Campus Map / Discover)
  if (entities.School.getAll().length === 0) {
    entities.School.create({
      name: 'Demo University',
      conference: 'Independent',
      follower_count: 0,
      primary_color: '#FF6B35',
      secondary_color: '#111827',
      // Default amenities around a sample stadium area
      amenities: [
        { type: 'restroom', name: 'Restroom - Gate A', lat: 33.2089, lng: -87.5508 },
        { type: 'food', name: 'Food Court', lat: 33.2093, lng: -87.5512 },
        { type: 'first_aid', name: 'First Aid', lat: 33.2091, lng: -87.5499 },
        { type: 'water', name: 'Water Station', lat: 33.2086, lng: -87.5497 },
        { type: 'atm', name: 'ATM', lat: 33.2082, lng: -87.5501 },
        { type: 'entrance', name: 'Stadium Entrance', lat: 33.2096, lng: -87.5504 },
      ],
    });
  }
}

// Call initialization
initializeSampleData();

export default {
  Game,
  Tailgate,
  TailgateGroup,
  CarLocation,
  FriendLocation,
  Prediction,
  TeamPost,
  TeamComment,
  Notification,
  School,
  UserLocation,
  ParkedCar,
};


