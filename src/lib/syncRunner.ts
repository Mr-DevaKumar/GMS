import { supabase } from './supabase';
import { getQueue, removeFromQueue } from './offlineQueue';

export async function flushQueue() {
  if (!navigator.onLine) return;
  const queue = await getQueue();
  for (const w of queue) {
    const { error } = await supabase.rpc('record_win', {
      p_client_uuid: w.client_uuid,
      p_name: w.name,
      p_age: w.age,
      p_anbiyam: w.anbiyam,
      p_game_id: w.game_id,
      p_recorded_at: w.recorded_at,
    });
    if (error) break;
    await removeFromQueue(w.client_uuid);
  }
}