import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { DotNumber } from '../../components/ui/Shared';
import AdminLayout from '../../components/AdminLayout';
import { Trophy, Users, Gamepad2, ArrowRight, Activity, Target } from 'lucide-react';

const STYLES = `
  @keyframes rise {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .animate-rise { animation: rise 0.5s cubic-bezier(0.2,0.8,0.2,1) both; }

  @keyframes ping-slow {
    75%, 100% { transform: scale(2); opacity: 0; }
  }
  .animate-ping-slow { animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite; }

  @media (prefers-reduced-motion: reduce) {
    .animate-rise, .animate-ping-slow { animation: none !important; }
  }
`;

function initialOf(name?: string) {
  return (name || '?').trim().charAt(0).toUpperCase();
}

export default function Dashboard() {
  const [stats, setStats] = useState({ totalWins: 0, totalGames: 0, players: 0, general: 0, grand: 0 });
  const [nearGrand, setNearGrand] = useState<any[]>([]);
  const [recentWins, setRecentWins] = useState<any[]>([]);

  useEffect(() => {
    load();
    const ch = supabase.channel('dash')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wins' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function load() {
    const [g, p, s, r, tg] = await Promise.all([
      supabase.from('v_game_winner_counts').select('*'),
      supabase.from('v_player_stats').select('*').order('distinct_games', { ascending: false }),
      supabase.from('event_settings').select('*').eq('id', 1).single(),
      supabase.from('wins').select('id, recorded_at, players(name), games(name)').eq('status', 'active').order('recorded_at', { ascending: false }).limit(5),
      supabase.from('games').select('*', { count: 'exact', head: true })
    ]);

    const players = p.data || [];
    const settings = s.data;

    setStats({
      totalWins: g.data?.reduce((acc, curr) => acc + curr.wins, 0) || 0,
      totalGames: tg.count || 0,
      players: players.length,
      general: players.filter(x => x.total_wins >= (settings?.general_threshold || 3)).length,
      grand: players.filter(x => x.distinct_games >= (settings?.grand_threshold || 10)).length,
    });

    setNearGrand(players.filter(x => x.distinct_games >= (settings?.near_grand_threshold || 5) && x.distinct_games < (settings?.grand_threshold || 10)));
    setRecentWins(r.data || []);
  }

  return (
    <AdminLayout>
      <style>{STYLES}</style>
      
      <div className="relative min-h-[100dvh] bg-[var(--bg)] text-[var(--ink)]">
        <div
          className="fixed inset-0 pointer-events-none opacity-50"
          style={{
            backgroundImage: 'radial-gradient(circle, var(--line) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
          aria-hidden="true"
        />

        <div className="relative p-4 md:p-8 max-w-7xl mx-auto space-y-8 pb-20">
          
          <header className="animate-rise">
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--green)] opacity-75 animate-ping-slow" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--green)]" />
              </span>
              <span className="label text-[var(--green)]">Live Sync</span>
            </div>
            <h1 className="dot-num text-3xl sm:text-4xl tracking-wide">COMMAND CENTER</h1>
            <p className="text-[var(--ink-2)] mt-1 text-sm sm:text-base">Real-time overview of the competition.</p>
          </header>

          {/* Stats Grid - Expanded to 5 columns on large screens */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            
            {/* Total Wins */}
            <div 
              className="relative overflow-hidden rounded-3xl p-5 sm:p-6 bg-[var(--ink)] text-[var(--bg)] shadow-lg animate-rise" 
              style={{ animationDelay: '60ms' }}
            >
              <div className="absolute top-4 right-4 grid grid-cols-3 gap-1 opacity-20" aria-hidden="true">
                {Array.from({ length: 9 }).map((_, i) => (
                  <span key={i} className="w-1 h-1 rounded-full bg-[var(--bg)]" />
                ))}
              </div>
              <Trophy className="mb-4 opacity-50" size={20} />
              <div className="label text-[var(--bg)] opacity-60 mb-1">Total Wins</div>
              <DotNumber value={stats.totalWins} size="text-4xl sm:text-5xl" />
            </div>
            
            {/* Total Games */}
            <div 
              className="relative overflow-hidden rounded-3xl p-5 sm:p-6 bg-[var(--surface)] border border-[var(--line)] animate-rise"
              style={{ animationDelay: '100ms' }}
            >
              <div className="w-8 h-8 rounded-full bg-[var(--blue)]/10 flex items-center justify-center mb-4 text-[var(--blue)]">
                <Gamepad2 size={16} />
              </div>
              <div className="label mb-1">Total Games</div>
              <DotNumber value={stats.totalGames} size="text-4xl sm:text-5xl" />
            </div>

            {/* Unique Players */}
            <div 
              className="relative overflow-hidden rounded-3xl p-5 sm:p-6 bg-[var(--surface)] border border-[var(--line)] animate-rise"
              style={{ animationDelay: '140ms' }}
            >
              <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-4 text-[var(--ink-2)]">
                <Users size={16} />
              </div>
              <div className="label mb-1">Unique Players</div>
              <DotNumber value={stats.players} size="text-4xl sm:text-5xl" />
            </div>

            {/* Near Grand */}
            <div 
              className="relative overflow-hidden rounded-3xl p-5 sm:p-6 bg-[var(--surface)] border border-[var(--line)] animate-rise"
              style={{ animationDelay: '180ms' }}
            >
              <div className="w-8 h-8 rounded-full bg-[var(--amber)]/10 flex items-center justify-center mb-4 text-[var(--amber)]">
                <Target size={16} />
              </div>
              <div className="label mb-1">Near Grand</div>
              <DotNumber value={nearGrand.length} size="text-4xl sm:text-5xl" />
            </div>

            {/* Grand Eligible */}
            <div 
              className="relative overflow-hidden rounded-3xl p-5 sm:p-6 bg-[var(--surface)] border border-[var(--line)] animate-rise col-span-2 md:col-span-1 lg:col-span-1"
              style={{ animationDelay: '220ms' }}
            >
              <div className="w-8 h-8 rounded-full bg-[var(--green)]/10 flex items-center justify-center mb-4 text-[var(--green)]">
                <Trophy size={16} />
              </div>
              <div className="label mb-1">Grand Eligible</div>
              <DotNumber value={stats.grand} size="text-4xl sm:text-5xl" />
            </div>
          </div>

          {/* Lists Grid */}
          <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
            
            {/* Close to Grand Prize */}
            <div 
              className="bg-[var(--surface)] border border-[var(--line)] rounded-3xl p-5 sm:p-6 animate-rise"
              style={{ animationDelay: '300ms' }}
            >
              <div className="flex justify-between items-center mb-5">
                <h2 className="label text-[var(--ink)] text-xs">Close to Grand</h2>
                <Link 
                  to="/admin/prizes" 
                  className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] hover:opacity-70 transition-opacity"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  Prize Desk <ArrowRight size={12}/>
                </Link>
              </div>
              
              {nearGrand.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-[var(--ink-2)] font-semibold">All clear</p>
                  <p className="text-xs text-[var(--ink-3)] mt-1">No players close to the grand prize yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--line)]">
                  {nearGrand.slice(0, 5).map(p => (
                    <div key={p.id} className="flex justify-between items-center py-3 group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-xs font-bold text-[var(--ink-2)] flex-shrink-0">
                          {initialOf(p.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm truncate">{p.name}</div>
                          <div className="text-[10px] font-mono text-[var(--ink-3)] truncate">
                            {p.age} yrs · {p.anbiyam || '—'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="dot-num text-xl text-[var(--accent)]">{p.distinct_games}</span>
                        <div className="text-[9px] font-mono text-[var(--ink-3)] uppercase tracking-wider mt-0.5">Games</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Activity */}
            <div 
              className="bg-[var(--surface)] border border-[var(--line)] rounded-3xl p-5 sm:p-6 animate-rise"
              style={{ animationDelay: '360ms' }}
            >
              <div className="flex justify-between items-center mb-5">
                <h2 className="label text-[var(--ink)] text-xs flex items-center gap-2">
                  Live Activity
                </h2>
                <Link 
                  to="/admin/winners" 
                  className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] hover:opacity-70 transition-opacity"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  All Wins <ArrowRight size={12}/>
                </Link>
              </div>

              {recentWins.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-[var(--ink-2)] font-semibold">Quiet in here</p>
                  <p className="text-xs text-[var(--ink-3)] mt-1">No wins recorded yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--line)]">
                  {recentWins.map(w => (
                    <div key={w.id} className="flex justify-between items-center py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-xs font-bold text-[var(--ink-2)] flex-shrink-0">
                          {initialOf(w.players?.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm truncate">{w.players?.name || 'Unknown'}</div>
                          <div className="text-[10px] text-[var(--ink-3)] truncate">
                            won <span className="font-medium text-[var(--ink-2)]">{w.games?.name || 'Unknown'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-[10px] font-mono text-[var(--ink-3)] flex-shrink-0 tabular-nums">
                        {new Date(w.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </AdminLayout>
  );
}