import { client } from '@/api/client';
import offlineStorage from './offlineStorage';

class SyncService {
  constructor() {
    this.isSyncing = false;
    this.setupListeners();
  }

  setupListeners() {
    window.addEventListener('gameday:back-online', () => {
      this.syncPendingActions();
    });

    setInterval(() => {
      if (navigator.onLine && !this.isSyncing) {
        this.syncPendingActions();
      }
    }, 30000);
  }

  async syncPendingActions() {
    if (this.isSyncing || !navigator.onLine) return;

    this.isSyncing = true;
    console.log('[GameDay Sync] Starting sync...');

    try {
      const pendingActions = await offlineStorage.getPendingSync();
      
      for (const action of pendingActions) {
        try {
          await this.processAction(action);
          await offlineStorage.removePendingSync(action.id);
          console.log(`[GameDay Sync] Completed: ${action.type}`);
        } catch (error) {
          console.error(`[GameDay Sync] Failed: ${action.type}`, error);
        }
      }

      window.dispatchEvent(new CustomEvent('gameday:sync-complete'));
    } finally {
      this.isSyncing = false;
    }
  }

  async processAction(action) {
    switch (action.type) {
      case 'CREATE_CAR_LOCATION':
        // Standalone: store the record locally (no remote upload).
        await client.entities.CarLocation.create(action.data);
        break;

      case 'UPDATE_LOCATION':
        // Standalone: friend/user location is stored locally.
        await client.entities.FriendLocation.update(action.id, action.data);
        break;

      case 'CREATE_TAILGATE':
        await client.entities.Tailgate.create(action.data);
        break;

      case 'RSVP_TAILGATE':
        await client.entities.Tailgate.update(action.id, action.data);
        break;

      default:
        console.warn(`[GameDay Sync] Unknown action type: ${action.type}`);
    }
  }
}

export const syncService = new SyncService();
export default syncService;


