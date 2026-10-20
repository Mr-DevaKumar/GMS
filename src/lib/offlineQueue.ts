import { openDB, type IDBPDatabase } from 'idb';

export interface QueuedWin {
  client_uuid: string;
  name: string;
  age: number;
  anbiyam: string;
  game_id: string;
  recorded_at: string;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB('contest-hub', 1, {
      upgrade(database) {
        if (!database.objectStoreNames.contains('winQueue')) {
          database.createObjectStore('winQueue', { keyPath: 'client_uuid' });
        }
      },
    });
  }
  return dbPromise;
}

export async function enqueue(win: QueuedWin) {
  const d = await db();
  await d.put('winQueue', win);
}

export async function removeFromQueue(client_uuid: string) {
  const d = await db();
  await d.delete('winQueue', client_uuid);
}

export async function getQueue(): Promise<QueuedWin[]> {
  const d = await db();
  return d.getAll('winQueue');
}

export async function queueSize(): Promise<number> {
  const d = await db();
  return d.count('winQueue');
}