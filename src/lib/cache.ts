import { openDB } from 'idb';

export const dbPromise = openDB('contest-hub-v2', 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('winQueue')) {
      db.createObjectStore('winQueue', { keyPath: 'client_uuid' });
    }
    if (!db.objectStoreNames.contains('cache_players')) {
      db.createObjectStore('cache_players', { keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains('cache_games')) {
      db.createObjectStore('cache_games', { keyPath: 'id' });
    }
  },
});