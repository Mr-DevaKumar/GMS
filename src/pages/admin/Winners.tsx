import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/AdminLayout';
import { useToast } from '../../components/Toast';
import { downloadCSV } from '../../lib/csv';
import { 
  Search, Download, Trash2, X, AlertTriangle, Gamepad2, Clock, Filter 
} from 'lucide-react';

interface Row {
  id: string;
  player_name: string;
  player_age: number | string;
  player_anbiyam: string;
  game_name: string;
  recorded_at: string;
  status: string;
}

const STYLES = `
  @keyframes rise {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .animate-rise { animation: rise 0.5s cubic-bezier(0.2,0.8,0.2,1) both; }

  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  .animate-fade-in { animation: fadeIn 0.2s ease-out both; }

  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95) translateY(10px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  .animate-scale-in { animation: scaleIn 0.3s cubic-bezier(0.2,0.8,0.2,1) both; }

  @keyframes ping-slow {
    75%, 100% { transform: scale(2); opacity: 0; }
  }
  .animate-ping-slow { animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite; }

  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .no-scrollbar::-webkit-scrollbar { display: none; }

  @media (prefers-reduced-motion: reduce) {
    .animate-rise, .animate-fade-in, .animate-scale-in, .animate-ping-slow { animation: none !important; }
  }
`;

function initialOf(name?: string) {
  return (name || '?').trim().charAt(0).toUpperCase();
}

export default function Winners() {
  const [rows, setRows] = useState<Row[]>([]);
  const [gamesList, setGamesList] = useState<{ id: string; name: string }[]>([]);
  
  // Filter States
  const [filterText, setFilterText] = useState('');
  const [filterGame, setFilterGame] = useState('');
  const [filterTime, setFilterTime] = useState('all'); // 'all', '1h', '24h'

  const [voidId, setVoidId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);
  const { show } = useToast();

  async function load() {
    const [w, g] = await Promise.all([
      supabase
        .from('wins')
        .select('id, recorded_at, status, players(name, age, anbiyam), games(name)')
        .order('recorded_at', { ascending: false }),
      supabase.from('games').select('id, name').order('name')
    ]);
      
    if (w.error) return show(w.error.message, true);
    
    setRows(
      (w.data || []).map((r: any) => ({
        id: r.id,
        player_name: r.players?.name || '—',
        player_age: r.players?.age || '—',
        player_anbiyam: r.players?.anbiyam || '—',
        game_name: r.games?.name || '—',
        recorded_at: r.recorded_at,
        status: r.status,
      }))
    );

    if (g.data) setGamesList(g.data);
  }

  useEffect(() => {
    load();
    const ch = supabase.channel('wins-adm').on('postgres_changes', { event: '*', schema: 'public', table: 'wins' }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function confirmVoid() {
    if (!voidId || !reason.trim()) return;
    setIsVoiding(true);
    const { error } = await supabase.from('wins').update({
      status: 'voided', void_reason: reason, voided_at: new Date().toISOString()
    }).eq('id', voidId);
    
    if (error) {
      setIsVoiding(false);
      return show(error.message, true);
    }
    show('Win voided successfully');
    setVoidId(null);
    setReason('');
    setIsVoiding(false);
    load();
  }

  // Apply all filters
  const filtered = rows.filter((r) => {
    // 1. Text Search
    const matchesText = !filterText || 
      r.player_name.toLowerCase().includes(filterText.toLowerCase()) || 
      r.game_name.toLowerCase().includes(filterText.toLowerCase());
      
    // 2. Game Filter
    const matchesGame = !filterGame || r.game_name === filterGame;

    // 3. Time Filter
    let matchesTime = true;
    if (filterTime === '1h') {
      matchesTime = (new Date().getTime() - new Date(r.recorded_at).getTime()) <= 60 * 60 * 1000;
    } else if (filterTime === '24h') {
      matchesTime = (new Date().getTime() - new Date(r.recorded_at).getTime()) <= 24 * 60 * 60 * 1000;
    }
    
    return matchesText && matchesGame && matchesTime;
  });

  function exportCSV() {
    downloadCSV(
      `winners-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Player', 'Age', 'Anbiyam', 'Game', 'Recorded at', 'Status'],
      filtered.map((r) => [r.player_name, r.player_age, r.player_anbiyam, r.game_name, new Date(r.recorded_at).toLocaleString(), r.status])
    );
  }

  const clearFilters = () => {
    setFilterText('');
    setFilterGame('');
    setFilterTime('all');
  };

  const hasActiveFilters = filterText || filterGame || filterTime !== 'all';

  return (
    <AdminLayout>
      <style>{STYLES}</style>
      
      <div className="relative h-[100dvh] bg-[var(--bg)] text-[var(--ink)] flex flex-col overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-50"
          style={{
            backgroundImage: 'radial-gradient(circle, var(--line) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
          aria-hidden="true"
        />

        <div className="relative flex flex-col flex-1 min-h-0 w-full max-w-7xl mx-auto px-4 md:px-8">
          
          {/* Header (Pinned) */}
          <header className="flex-shrink-0 flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-6 md:pt-8 pb-4 animate-rise">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--green)] opacity-75 animate-ping-slow" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--green)]" />
                </span>
                <span className="label text-[var(--green)]">Live Log</span>
              </div>
              <h1 className="dot-num text-3xl sm:text-4xl tracking-wide">WINNERS</h1>
              <p className="text-[var(--ink-2)] text-sm sm:text-base mt-1">
                Audit and manage all recorded wins.
              </p>
            </div>
            
            <button 
              className="
                inline-flex items-center justify-center gap-2 
                bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] 
                h-12 px-6 rounded-xl font-bold text-sm tracking-[0.06em] uppercase
                active:scale-[0.98] transition-transform hover:border-[var(--ink-3)]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]
                w-full sm:w-auto shadow-sm flex-shrink-0
              "
              onClick={exportCSV}
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              <Download size={18} /> Export CSV
            </button>
          </header>

          {/* Filter Bar (Pinned) */}
          <div className="flex-shrink-0 bg-[var(--surface)] p-3 rounded-2xl border border-[var(--line)] shadow-sm mb-6 flex flex-col md:flex-row gap-3 animate-rise" style={{ animationDelay: '60ms' }}>
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-3)] pointer-events-none" size={18} />
              <input
                className="input !pl-10 !h-11 !rounded-xl !text-sm"
                placeholder="Search player or game…"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              {/* Game Dropdown */}
              <div className="relative flex-1 md:w-48">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-3)] pointer-events-none">
                  <Gamepad2 size={16} />
                </div>
                <select
                  className="input !pl-9 !h-11 !rounded-xl !text-sm appearance-none bg-[var(--surface)] w-full"
                  value={filterGame}
                  onChange={(e) => setFilterGame(e.target.value)}
                >
                  <option value="">All Games</option>
                  {gamesList.map(g => (
                    <option key={g.id} value={g.name}>{g.name}</option>
                  ))}
                </select>
              </div>

              {/* Time Dropdown */}
              <div className="relative flex-1 md:w-40">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-3)] pointer-events-none">
                  <Clock size={16} />
                </div>
                <select
                  className="input !pl-9 !h-11 !rounded-xl !text-sm appearance-none bg-[var(--surface)] w-full"
                  value={filterTime}
                  onChange={(e) => setFilterTime(e.target.value)}
                >
                  <option value="all">All Time</option>
                  <option value="1h">Last Hour</option>
                  <option value="24h">Last 24 Hours</option>
                </select>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="h-11 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-[var(--accent)] bg-[var(--accent-soft)] hover:bg-[var(--accent)] hover:text-white transition-colors"
                >
                  <X size={14} /> Clear
                </button>
              )}
            </div>
          </div>

          {/* ================= SCROLLABLE CONTENT ================= */}
          <div className="flex-1 overflow-y-auto no-scrollbar min-h-0 pb-6 animate-rise" style={{ animationDelay: '120ms' }}>
            
            {/* MOBILE VIEW (Cards) */}
            <div className="md:hidden flex flex-col gap-3">
              {filtered.map((r) => (
                <div 
                  key={r.id} 
                  className="bg-[var(--surface)] border border-[var(--line)] rounded-3xl p-4 flex flex-col shadow-sm"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--surface-2)] to-[var(--line)] border border-[var(--line)] flex items-center justify-center flex-shrink-0 shadow-inner">
                        <span className="dot-num text-sm text-[var(--ink)]">{initialOf(r.player_name)}</span>
                      </div>
                      <div>
                        <div className="font-bold text-[15px] leading-tight">{r.player_name}</div>
                        <div className="text-[10px] font-mono text-[var(--ink-3)] mt-0.5">{r.player_age} yrs · {r.player_anbiyam}</div>
                      </div>
                    </div>
                    {r.status === 'active' ? (
                      <span className="bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20 px-2.5 py-1 rounded-full text-[9px] font-bold font-mono tracking-wider">ACTIVE</span>
                    ) : (
                      <span className="bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20 px-2.5 py-1 rounded-full text-[9px] font-bold font-mono tracking-wider">VOIDED</span>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center mt-1 pt-3 border-t border-[var(--line)]">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-2)]">
                      <Gamepad2 size={14} className="opacity-70" /> {r.game_name}
                    </div>
                    <div className="text-[10px] font-mono text-[var(--ink-3)]">
                      {new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  {r.status === 'active' && (
                    <button 
                      onClick={() => setVoidId(r.id)} 
                      className="mt-4 w-full h-10 rounded-xl bg-[var(--surface-2)] text-[var(--accent)] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      <Trash2 size={14} /> Void this win
                    </button>
                  )}
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-16 bg-[var(--surface)] border border-dashed border-[var(--line)] rounded-3xl">
                  <p className="text-sm font-semibold text-[var(--ink-2)]">No wins found</p>
                  <p className="text-xs text-[var(--ink-3)] mt-1">Try adjusting your filters.</p>
                </div>
              )}
            </div>

            {/* DESKTOP VIEW (Table) */}
            <div className="hidden md:block bg-[var(--surface)] border border-[var(--line)] rounded-3xl overflow-hidden shadow-sm">
              <table className="w-full text-sm text-left relative">
                <thead className="sticky top-0 z-10 bg-[var(--surface-2)]/95 backdrop-blur-sm shadow-sm border-b border-[var(--line)]">
                  <tr>
                    <th className="px-6 py-4 label text-[var(--ink-3)]">Player</th>
                    <th className="px-6 py-4 label text-[var(--ink-3)]">Game</th>
                    <th className="px-6 py-4 label text-[var(--ink-3)]">Time</th>
                    <th className="px-6 py-4 label text-[var(--ink-3)]">Status</th>
                    <th className="px-6 py-4 label text-[var(--ink-3)] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-[var(--surface-2)]/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center flex-shrink-0 text-xs font-bold text-[var(--ink-2)]">
                            {initialOf(r.player_name)}
                          </div>
                          <div>
                            <div className="font-bold text-[15px]">{r.player_name}</div>
                            <div className="text-[11px] text-[var(--ink-3)] font-mono">{r.player_age} yrs · {r.player_anbiyam}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-[var(--ink-2)]">
                        {r.game_name}
                      </td>
                      <td className="px-6 py-4 font-mono text-[11px] text-[var(--ink-3)]">
                        {new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono tracking-wider border ${r.status === 'active' ? 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/20' : 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20'}`}>
                          {r.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {r.status === 'active' && (
                          <button 
                            onClick={() => setVoidId(r.id)} 
                            className="p-2 text-[var(--ink-3)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] rounded-full transition-colors opacity-50 group-hover:opacity-100"
                            title="Void Win"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-sm font-semibold text-[var(--ink-2)]">No wins found</p>
                  <p className="text-xs text-[var(--ink-3)] mt-1">Try adjusting your filters.</p>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ================= CENTERED VOID MODAL ================= */}
        {voidId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="bg-[var(--surface)] w-full max-w-md rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-scale-in border border-[var(--line)] relative">
              
              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-[var(--accent-soft)] to-transparent opacity-50 pointer-events-none" />

              <div className="relative p-6 border-b border-[var(--line)] flex-shrink-0 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2 text-[var(--accent)]">
                    <AlertTriangle size={20} /> Void Win
                  </h3>
                  <p className="text-[11px] text-[var(--ink-3)] mt-1 font-mono uppercase tracking-wider">This action is audited</p>
                </div>
                <button 
                  onClick={() => { setVoidId(null); setReason(''); }} 
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--surface-2)] text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--line)] active:scale-90 transition-all flex-shrink-0 z-10"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 flex flex-col gap-5 relative">
                <p className="text-sm text-[var(--ink-2)] leading-relaxed">
                  Are you sure you want to void this win? This will instantly remove it from the leaderboard and cannot be undone.
                </p>
                
                <div>
                  <label className="label block mb-2 text-[var(--ink-2)]">Reason for Voiding</label>
                  <input 
                    autoFocus
                    className="input" 
                    placeholder="e.g. Wrong player recorded" 
                    value={reason} 
                    onChange={e => setReason(e.target.value)} 
                  />
                </div>

                <button 
                  className="
                    w-full h-14 rounded-2xl mt-2
                    inline-flex items-center justify-center gap-2
                    bg-[var(--accent)] text-white
                    text-sm font-bold uppercase tracking-[0.08em]
                    active:scale-[0.98] transition-transform
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]
                    disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[var(--accent)]/20
                  " 
                  style={{ fontFamily: 'var(--font-mono)' }}
                  onClick={confirmVoid}
                  disabled={!reason.trim() || isVoiding}
                >
                  {isVoiding ? 'Voiding…' : 'Confirm Void'}
                </button>
              </div>
            </div>
          </div>
        )}
        
      </div>
    </AdminLayout>
  );
}