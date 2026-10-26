import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/AdminLayout';
import { useToast } from '../../components/Toast';
import type { Game, Profile } from '../../types';
import { 
  Plus, Gamepad2, Clock, Check, Users, Settings2, X, 
  LayoutGrid, Pencil 
} from 'lucide-react';

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

  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .no-scrollbar::-webkit-scrollbar { display: none; }

  @media (prefers-reduced-motion: reduce) {
    .animate-rise, .animate-fade-in, .animate-scale-in { animation: none !important; }
  }
`;

function initialOf(name?: string) {
  return (name || '?').trim().charAt(0).toUpperCase();
}

export default function Games() {
  const [games, setGames] = useState<Game[]>([]);
  const [coordinators, setCoordinators] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<{ game_id: string; user_id: string }[]>([]);
  
  // Add/Edit Game State
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [timer, setTimer] = useState('');
  
  // Manage Coordinators State
  const [managingGame, setManagingGame] = useState<Game | null>(null);

  const { show } = useToast();

  async function load() {
    const [g, c, a] = await Promise.all([
      supabase.from('games').select('*').order('name'),
      supabase.from('profiles').select('*').eq('role', 'coordinator'),
      supabase.from('game_coordinators').select('*'),
    ]);
    setGames((g.data || []) as Game[]);
    setCoordinators((c.data || []) as Profile[]);
    setAssignments(a.data || []);
  }

  useEffect(() => {
    load();
  }, []);

  function openAdd() {
    setEditId(null);
    setName('');
    setTimer('');
    setIsOpen(true);
  }

  function openEdit(g: Game) {
    setEditId(g.id);
    setName(g.name);
    setTimer(g.timer_seconds ? String(g.timer_seconds) : '');
    setIsOpen(true);
  }

  async function saveGame() {
    if (!name.trim()) return;
    
    const payload = {
      name: name.trim(),
      timer_seconds: timer ? parseInt(timer) : null,
    };

    if (editId) {
      // Update existing game
      const { error } = await supabase.from('games').update(payload).eq('id', editId);
      if (error) return show(error.message, true);

      // If timer exists, sync it to the timer_state so coordinators see the update instantly
      if (payload.timer_seconds) {
        await supabase.rpc('update_timer_duration', { 
          p_game_id: editId, 
          p_seconds: payload.timer_seconds 
        });
      } else {
        // If timer was removed, clean up the timer state
        await supabase.from('timer_state').delete().eq('game_id', editId);
      }
      show('Game updated');
    } else {
      // Insert new game
      const { error } = await supabase.from('games').insert(payload);
      if (error) return show(error.message, true);
      show('Game added');
    }
    
    setIsOpen(false);
    load();
  }

  async function toggleActive(g: Game) {
    const { error } = await supabase.from('games').update({ is_active: !g.is_active }).eq('id', g.id);
    if (error) return show(error.message, true);
    load();
  }

  async function toggleAssign(gameId: string, userId: string) {
    const exists = assignments.find((a) => a.game_id === gameId && a.user_id === userId);
    if (exists) {
      const { error } = await supabase.from('game_coordinators').delete().match({ game_id: gameId, user_id: userId });
      if (error) return show(error.message, true);
    } else {
      const { error } = await supabase.from('game_coordinators').insert({ game_id: gameId, user_id: userId });
      if (error) return show(error.message, true);
    }
    load();
  }

  const getAssignedCount = (gameId: string) => assignments.filter(a => a.game_id === gameId).length;

  return (
    <AdminLayout>
      <style>{STYLES}</style>
      
      <div className="relative min-h-[100dvh] bg-[var(--bg)] text-[var(--ink)]">
        {/* Fixed dot-grid canvas */}
        <div
          className="fixed inset-0 pointer-events-none opacity-50"
          style={{
            backgroundImage: 'radial-gradient(circle, var(--line) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
          aria-hidden="true"
        />

        <div className="relative p-4 md:p-8 max-w-6xl mx-auto pb-20">
          
          {/* Header */}
          <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 animate-rise">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <LayoutGrid size={18} className="text-[var(--accent)]" />
                <span className="label text-[var(--ink-3)]">Event Directory</span>
              </div>
              <h1 className="dot-num text-3xl sm:text-4xl tracking-wide">GAMES</h1>
              <p className="text-[var(--ink-2)] text-sm sm:text-base mt-1">
                Manage active games and assign staff.
              </p>
            </div>
            
            <button 
              onClick={openAdd} 
              className="
                inline-flex items-center justify-center gap-2 
                bg-[var(--ink)] text-[var(--bg)] 
                h-12 px-6 rounded-xl font-bold text-sm tracking-[0.06em] uppercase
                active:scale-[0.98] transition-transform
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]
                w-full sm:w-auto shadow-lg
              "
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              <Plus size={18} /> Add Game
            </button>
          </header>

          {/* Games Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {games.map((g, i) => {
              const isActive = g.is_active;
              const assignedCount = getAssignedCount(g.id);
              const assignedCoordinators = coordinators.filter(c => 
                assignments.some(a => a.game_id === g.id && a.user_id === c.id)
              );

              return (
                <div 
                  key={g.id} 
                  className="
                    group relative bg-[var(--surface)] border border-[var(--line)] rounded-3xl p-5 
                    flex flex-col animate-rise shadow-sm hover:shadow-md hover:border-[var(--ink-3)] 
                    transition-all duration-300
                  "
                  style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
                >
                  {/* Top Row: Icon, Title & Status */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--surface-2)] to-[var(--line)] border border-[var(--line)] flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300">
                      <Gamepad2 size={24} className="text-[var(--ink)]" />
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => openEdit(g)}
                        className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--surface-2)] text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors"
                        title="Edit Game"
                      >
                        <Pencil size={14} />
                      </button>
                      
                      <button 
                        onClick={() => toggleActive(g)}
                        className={`
                          px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors
                          ${isActive 
                            ? 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/20 hover:bg-[var(--green)]/20' 
                            : 'bg-[var(--surface-2)] text-[var(--ink-3)] border-[var(--line)] hover:text-[var(--ink)]'}
                        `}
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {isActive ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </div>

                  {/* Middle Row: Title & Meta */}
                  <div className="min-w-0 mb-4">
                    <h3 className="font-bold text-xl truncate leading-tight group-hover:text-[var(--accent)] transition-colors">
                      {g.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] font-mono text-[var(--ink-3)]">
                      <Clock size={12} />
                      {g.timer_seconds ? `${g.timer_seconds}s Timer` : 'No Timer'}
                    </div>
                  </div>

                  {/* Bottom Row: Coordinator Summary & Manage */}
                  <div className="mt-auto pt-4 border-t border-[var(--line)]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5 text-[var(--ink-3)]">
                        <Users size={14} />
                        <span className="label">Staff ({assignedCount})</span>
                      </div>
                      <button 
                        onClick={() => setManagingGame(g)}
                        className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] hover:opacity-70 transition-opacity flex items-center gap-1 group-hover:underline"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        <Settings2 size={12} /> Manage
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {assignedCoordinators.slice(0, 3).map((c) => (
                        <div 
                          key={c.id} 
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--surface-2)] rounded-md text-xs font-semibold text-[var(--ink-2)] border border-[var(--line)]"
                        >
                          <div className="w-4 h-4 rounded-full bg-[var(--ink)] text-[var(--bg)] flex items-center justify-center text-[9px] font-bold">
                            {initialOf(c.display_name)}
                          </div>
                          <span className="truncate max-w-[80px]">{c.display_name}</span>
                        </div>
                      ))}
                      
                      {assignedCoordinators.length > 3 && (
                        <div className="flex items-center justify-center px-2.5 py-1 bg-[var(--surface-2)] border border-[var(--line)] rounded-md text-xs font-bold text-[var(--ink-3)]">
                          +{assignedCoordinators.length - 3}
                        </div>
                      )}

                      {assignedCoordinators.length === 0 && (
                        <span className="text-xs text-[var(--ink-3)] italic py-1">No staff assigned</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {games.length === 0 && (
              <div className="col-span-1 md:col-span-3 py-24 text-center bg-[var(--surface)] border border-dashed border-[var(--line)] rounded-3xl animate-rise">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--surface-2)] mb-5 text-[var(--ink-3)]">
                  <Gamepad2 size={28} />
                </div>
                <h3 className="font-bold text-xl mb-1">No games yet</h3>
                <p className="text-[var(--ink-3)] text-sm max-w-xs mx-auto">
                  Your event directory is empty. Tap "Add Game" to create your first one.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* ================= CENTERED ADD / EDIT GAME MODAL ================= */}
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="bg-[var(--surface)] w-full max-w-md rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-scale-in border border-[var(--line)] relative">
              
              {/* Decorative Mesh Background in Header */}
              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-[var(--accent-soft)] to-transparent opacity-50 pointer-events-none" />

              {/* Modal Header */}
              <div className="relative p-6 border-b border-[var(--line)] flex-shrink-0 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Gamepad2 size={20} className="text-[var(--accent)]" /> 
                    {editId ? 'Edit Game' : 'Add Game'}
                  </h3>
                  <p className="text-[11px] text-[var(--ink-3)] mt-1 font-mono uppercase tracking-wider">
                    {editId ? 'Update details or timer' : 'Create a new event game'}
                  </p>
                </div>
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--surface-2)] text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--line)] active:scale-90 transition-all flex-shrink-0 z-10"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 flex flex-col gap-5 relative">
                <div>
                  <label className="label block mb-2 text-[var(--ink-2)]">Game Name</label>
                  <div className="relative">
                    <Gamepad2 className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-3)] pointer-events-none" size={18} />
                    <input 
                      autoFocus 
                      className="input !pl-12" 
                      placeholder="e.g. Ring Toss" 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="label text-[var(--ink-2)]">Timer Duration</label>
                    <span className="label text-[var(--accent)] bg-[var(--accent-soft)] px-2 py-0.5 rounded-sm">Optional</span>
                  </div>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-3)] pointer-events-none" size={18} />
                    <input 
                      className="input !pl-12" 
                      type="number" 
                      placeholder="Seconds (leave empty for no timer)" 
                      value={timer} 
                      onChange={e => setTimer(e.target.value)} 
                    />
                  </div>
                </div>

                <button 
                  className="
                    w-full h-14 rounded-2xl mt-4
                    inline-flex items-center justify-center gap-2
                    bg-[var(--ink)] text-[var(--bg)]
                    text-sm font-bold uppercase tracking-[0.08em]
                    active:scale-[0.98] transition-transform
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]
                    disabled:opacity-40 disabled:cursor-not-allowed shadow-lg
                  " 
                  style={{ fontFamily: 'var(--font-mono)' }}
                  onClick={saveGame}
                  disabled={!name.trim()}
                >
                  <Check size={18} /> 
                  {editId ? 'Save Changes' : 'Save Game'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= CENTERED MANAGE COORDINATORS MODAL ================= */}
        {managingGame && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="bg-[var(--surface)] w-full max-w-md rounded-[2rem] shadow-2xl flex flex-col max-h-[85dvh] overflow-hidden animate-scale-in border border-[var(--line)] relative">
              
              {/* Decorative Mesh Background in Header */}
              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-[var(--accent-soft)] to-transparent opacity-50 pointer-events-none" />

              {/* Modal Header */}
              <div className="relative p-6 border-b border-[var(--line)] flex-shrink-0 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Users size={20} className="text-[var(--accent)]" /> Assign Staff
                  </h3>
                  <p className="text-[11px] text-[var(--ink-3)] mt-1 font-mono uppercase tracking-wider truncate max-w-[200px]">{managingGame.name}</p>
                </div>
                <button 
                  onClick={() => setManagingGame(null)} 
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--surface-2)] text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--line)] active:scale-90 transition-all flex-shrink-0 z-10"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Scrollable Body */}
              <div className="p-4 sm:p-5 overflow-y-auto no-scrollbar flex-1 relative">
                <div className="flex items-center justify-between mb-4 px-1">
                  <span className="label text-[var(--ink-2)]">Available Staff</span>
                  <span className="label text-[var(--accent)] bg-[var(--accent-soft)] px-2 py-0.5 rounded-sm">{getAssignedCount(managingGame.id)} Assigned</span>
                </div>

                <div className="flex flex-col gap-2">
                  {coordinators.map(c => {
                    const assigned = assignments.some(a => a.game_id === managingGame.id && a.user_id === c.id);
                    
                    return (
                      <button
                        key={c.id}
                        onClick={() => toggleAssign(managingGame.id, c.id)}
                        className={`
                          w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all active:scale-[0.99]
                          ${assigned 
                            ? 'border-[var(--ink)] bg-[var(--surface)] shadow-sm' 
                            : 'border-[var(--line)] bg-transparent hover:bg-[var(--surface-2)]'}
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${assigned ? 'bg-[var(--ink)] text-[var(--bg)]' : 'bg-[var(--surface-2)] text-[var(--ink-2)]'}`}>
                            {initialOf(c.display_name)}
                          </div>
                          <span className={`font-semibold text-[15px] transition-colors ${assigned ? 'text-[var(--ink)]' : 'text-[var(--ink-2)]'}`}>{c.display_name}</span>
                        </div>
                        
                        <div className={`
                          w-6 h-6 rounded-full flex items-center justify-center transition-colors flex-shrink-0
                          ${assigned ? 'bg-[var(--ink)] text-[var(--bg)]' : 'border-2 border-[var(--line)]'}
                        `}>
                          {assigned && <Check size={14} strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })}
                  
                  {coordinators.length === 0 && (
                    <div className="text-center py-10 text-[var(--ink-3)] text-sm">
                      No coordinators exist yet. Add them in the Coordinators tab.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}
        
      </div>
    </AdminLayout>
  );
}
