// src/lib/sync.ts
import { supabase } from './supabase';
import { dbPromise } from './cache';

let isSyncing = false;
export async function flushQueue() {
  if (!navigator.onLine || isSyncing) return;
  isSyncing = true;
  try {
    const db = await dbPromise;
    const queue = await db.getAll('winQueue');
    for (const item of queue) {
      const { data, error } = await supabase.rpc('record_win', {
        p_client_uuid: item.client_uuid,
        p_name: item.name,
        p_age: item.age,
        p_anbiyam: item.anbiyam,
        p_game_id: item.game_id,
        p_recorded_at: item.recorded_at,
      });
      if (!error || error.message.includes('duplicate')) {
        await db.delete('winQueue', item.client_uuid);
      } else if (error) {
        // Business error (entry closed). Break loop to prevent infinite spam.
        break; 
      }
    }
  } finally {
    isSyncing = false;
  }
}