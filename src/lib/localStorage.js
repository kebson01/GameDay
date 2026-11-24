// Local Storage Manager for GameDay
// Provides persistent storage for all app data

const STORAGE_KEYS = {
  USER: 'gameday_user',
  GAMES: 'gameday_games',
  TAILGATES: 'gameday_tailgates',
  GROUPS: 'gameday_groups',
  CAR_LOCATIONS: 'gameday_car_locations',
  FRIEND_LOCATIONS: 'gameday_friend_locations',
  PREDICTIONS: 'gameday_predictions',
  TEAM_POSTS: 'gameday_team_posts',
  TEAM_COMMENTS: 'gameday_team_comments',
  NOTIFICATIONS: 'gameday_notifications',
  SETTINGS: 'gameday_settings',
  SCHOOLS: 'gameday_schools',
  USER_LOCATIONS: 'gameday_user_locations',
  PARKED_CARS: 'gameday_parked_cars',
};

// Generic storage helpers
function getItem(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error(`Error reading ${key}:`, e);
    return defaultValue;
  }
}

// Writes that cloud sync makes itself are flagged so they don't echo back up
let suppressChangeEvents = 0;
export function withoutChangeEvents(fn) {
  suppressChangeEvents++;
  try {
    return fn();
  } finally {
    suppressChangeEvents--;
  }
}

function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    if (!suppressChangeEvents && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gameday:local-change', { detail: { key } }));
    }
    return true;
  } catch (e) {
    console.error(`Error writing ${key}:`, e);
    return false;
  }
}

function removeItem(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    console.error(`Error removing ${key}:`, e);
    return false;
  }
}

// Generate unique IDs
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Entity-based storage (CRUD operations)
class LocalEntity {
  constructor(storageKey) {
    this.storageKey = storageKey;
  }

  getAll() {
    return getItem(this.storageKey, []);
  }

  get(id) {
    const items = this.getAll();
    return items.find(item => item.id === id) || null;
  }

  create(data) {
    const items = this.getAll();
    const newItem = {
      ...data,
      id: generateId(),
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
    };
    items.push(newItem);
    setItem(this.storageKey, items);
    return newItem;
  }

  update(id, data) {
    const items = this.getAll();
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return null;
    
    items[index] = {
      ...items[index],
      ...data,
      updated_date: new Date().toISOString(),
    };
    setItem(this.storageKey, items);
    return items[index];
  }

  delete(id) {
    const items = this.getAll();
    const filtered = items.filter(item => item.id !== id);
    setItem(this.storageKey, filtered);
    return true;
  }

  filter(conditions = {}, sortBy = null, limit = null) {
    let items = this.getAll();
    
    // Apply filters
    Object.entries(conditions).forEach(([key, value]) => {
      items = items.filter(item => {
        // Handle nested properties like 'members.email'
        const keys = key.split('.');
        let itemValue = item;
        for (const k of keys) {
          if (Array.isArray(itemValue)) {
            return itemValue.some(v => v[k] === value);
          }
          itemValue = itemValue?.[k];
        }
        return itemValue === value;
      });
    });
    
    // Apply sorting
    if (sortBy) {
      const desc = sortBy.startsWith('-');
      const field = desc ? sortBy.slice(1) : sortBy;
      items.sort((a, b) => {
        const aVal = a[field] || '';
        const bVal = b[field] || '';
        const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        return desc ? -comparison : comparison;
      });
    }
    
    // Apply limit
    if (limit) {
      items = items.slice(0, limit);
    }
    
    return items;
  }

  clear() {
    setItem(this.storageKey, []);
  }
}

// Export storage keys and helpers
export { STORAGE_KEYS, getItem, setItem, removeItem, generateId };

// Export entity managers
export const entities = {
  Game: new LocalEntity(STORAGE_KEYS.GAMES),
  Tailgate: new LocalEntity(STORAGE_KEYS.TAILGATES),
  TailgateGroup: new LocalEntity(STORAGE_KEYS.GROUPS),
  CarLocation: new LocalEntity(STORAGE_KEYS.CAR_LOCATIONS),
  FriendLocation: new LocalEntity(STORAGE_KEYS.FRIEND_LOCATIONS),
  Prediction: new LocalEntity(STORAGE_KEYS.PREDICTIONS),
  TeamPost: new LocalEntity(STORAGE_KEYS.TEAM_POSTS),
  TeamComment: new LocalEntity(STORAGE_KEYS.TEAM_COMMENTS),
  Notification: new LocalEntity(STORAGE_KEYS.NOTIFICATIONS),
  School: new LocalEntity(STORAGE_KEYS.SCHOOLS),
  UserLocation: new LocalEntity(STORAGE_KEYS.USER_LOCATIONS),
  ParkedCar: new LocalEntity(STORAGE_KEYS.PARKED_CARS),
};


