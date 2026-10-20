import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { PlayerStat } from '../types';

export default function Display() {
  const [counts, setCounts] = useState<{ name: string; wins: number }[]>([]);
  const [top, setTop] = useState<PlayerStat[]>([]);

  async function load() {
    const [g, p] = await Promise.all([
      supabase.from('v_game_winner_counts').select('*').order('wins', { ascending: false }),
      supabase.from('v_player_stats').select('*').order('distinct_games', { ascending: false }).limit(15),
    ]);
    setCounts((g.data || []) as any);
    setTop((p.data || []) as PlayerStat[]);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel('display')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wins' }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  return (
    <div className="min-h-screen p-8">
      <div className="text-center mb-8">
        <div className="label">Live leaderboard</div>
        <h1 className="text-5xl font-bold">Mission Sunday</h1>
      </div>

      <div className="grid grid-cols-2 gap-6 max-w-6xl mx-auto">
        <div>
          <h2 className="label mb-4">Wins per game</h2>
          <div className="flex flex-col gap-2">
            {counts.map((c) => (
              <div key={c.name} className="flex justify-between items-center bg-[var(--surface)] rounded-2xl px-6 py-4">
                <span className="text-2xl font-semibold">{c.name}</span>
                <span className="font-mono text-4xl font-bold">{c.wins}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="label mb-4">Top players</h2>
          <div className="flex flex-col gap-2">
            {top.slice(0, 10).map((p, i) => (
              <div key={p.id} className="flex justify-between items-center bg-[var(--surface)] rounded-2xl px-6 py-3">
                <div className="flex gap-4 items-center">
                  <span className="font-mono text-2xl font-bold text-[var(--ink-3)]">
                    {i + 1}
                  </span>
                  <span className="text-xl font-semibold">{p.name}</span>
                </div>
                <span className="font-mono text-lg">{p.distinct_games} games</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}