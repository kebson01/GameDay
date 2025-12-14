// Lightweight IndexedDB wrapper for offline data
const DB_NAME = 'gameday-offline';
const DB_VERSION = 1;

const STORES = {
  CAR_LOCATIONS: 'car_locations',
  FRIEND_LOCATIONS: 'friend_locations',
  TAILGATES: 'tailgates',
  GAMES: 'games',
  PENDING_SYNC: 'pending_sync',
  USER_DATA: 'user_data',
};

let db = null;

export async function initDB() {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      if (!database.objectStoreNames.contains(STORES.CAR_LOCATIONS)) {
        database.createObjectStore(STORES.CAR_LOCATIONS, { keyPath: 'id', autoIncrement: true });
      }

      if (!database.objectStoreNames.contains(STORES.FRIEND_LOCATIONS)) {
        const friendStore = database.createObjectStore(STORES.FRIEND_LOCATIONS, { keyPath: 'id' });
        friendStore.createIndex('email', 'email', { unique: false });
      }

      if (!database.objectStoreNames.contains(STORES.TAILGATES)) {
        const tailgateStore = database.createObjectStore(STORES.TAILGATES, { keyPath: 'id' });
        tailgateStore.createIndex('game_date', 'game_date', { unique: false });
      }

      if (!database.objectStoreNames.contains(STORES.GAMES)) {
        database.createObjectStore(STORES.GAMES, { keyPath: 'id' });
      }

      if (!database.objectStoreNames.contains(STORES.PENDING_SYNC)) {
        const syncStore = database.createObjectStore(STORES.PENDING_SYNC, { keyPath: 'id', autoIncrement: true });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!database.objectStoreNames.contains(STORES.USER_DATA)) {
        database.createObjectStore(STORES.USER_DATA, { keyPath: 'key' });
      }
    };
  });
}

export async function saveItem(storeName, item) {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(item);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getItem(storeName, key) {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllItems(storeName) {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteItem(storeName, key) {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearStore(storeName) {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export const offlineStorage = {
  async saveCarLocation(location) {
    return saveItem(STORES.CAR_LOCATIONS, {
      ...location,
      id: location.id || `car_${Date.now()}`,
      savedAt: new Date().toISOString(),
    });
  },

  async getCarLocations() {
    return getAllItems(STORES.CAR_LOCATIONS);
  },

  async deleteCarLocation(id) {
    return deleteItem(STORES.CAR_LOCATIONS, id);
  },

  async saveFriendLocations(locations) {
    for (const loc of locations) {
      await saveItem(STORES.FRIEND_LOCATIONS, loc);
    }
  },

  async getFriendLocations() {
    return getAllItems(STORES.FRIEND_LOCATIONS);
  },

  async saveTailgates(tailgates) {
    for (const tailgate of tailgates) {
      await saveItem(STORES.TAILGATES, tailgate);
    }
  },

  async getTailgates() {
    return getAllItems(STORES.TAILGATES);
  },

  async saveGames(games) {
    for (const game of games) {
      await saveItem(STORES.GAMES, { ...game, id: game.id || `game_${game.date}_${game.opponent}` });
    }
  },

  async getGames() {
    return getAllItems(STORES.GAMES);
  },

  async queueForSync(action) {
    return saveItem(STORES.PENDING_SYNC, {
      ...action,
      timestamp: Date.now(),
      status: 'pending',
    });
  },

  async getPendingSync() {
    return getAllItems(STORES.PENDING_SYNC);
  },

  async removePendingSync(id) {
    return deleteItem(STORES.PENDING_SYNC, id);
  },

  async clearPendingSync() {
    return clearStore(STORES.PENDING_SYNC);
  },

  async saveUserData(key, data) {
    return saveItem(STORES.USER_DATA, { key, data, updatedAt: Date.now() });
  },

  async getUserData(key) {
    const item = await getItem(STORES.USER_DATA, key);
    return item?.data;
  },
};

export { STORES };
export default offlineStorage;


