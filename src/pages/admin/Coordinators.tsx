import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/AdminLayout';
import { useToast } from '../../components/Toast';
import type { Profile } from '../../types';
import { Plus, Check, X, ShieldCheck, Fingerprint, KeyRound, UserPlus } from 'lucide-react';

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

  @media (prefers-reduced-motion: reduce) {
    .animate-rise, .animate-fade-in, .animate-scale-in { animation: none !important; }
  }
`;

function initialOf(name?: string) {
  return (name || '?').trim().charAt(0).toUpperCase();
}

export default function Coordinators() {
  const [list, setList] = useState<Profile[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const { show } = useToast();

  async function load() {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'coordinator').order('display_name');
    setList((data || []) as Profile[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    if (!name.trim() || !pin) return show('Name and PIN required', true);
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) return show('Not authenticated', true);

    const res = await fetch('/api/create-coordinator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: name.trim(), pin }),
    });
    const data = await res.json();
    if (!res.ok) return show(data.error || 'Failed', true);
    
    show('Coordinator created');
    setName('');
    setPin('');
    setIsOpen(false);
    load();
  }

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
                <ShieldCheck size={18} className="text-[var(--accent)]" />
                <span className="label text-[var(--ink-3)]">Admin Directory</span>
              </div>
              <h1 className="dot-num text-3xl sm:text-4xl tracking-wide">COORDINATORS</h1>
              <p className="text-[var(--ink-2)] text-sm sm:text-base mt-1">
                Manage your staff and generate secure access PINs.
              </p>
            </div>
            
            <button 
              onClick={() => setIsOpen(true)} 
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
              <UserPlus size={18} /> Add Staff
            </button>
          </header>

          {/* Coordinators Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {list.map((c, i) => (
              <div 
                key={c.id} 
                className="
                  group relative bg-[var(--surface)] border border-[var(--line)] rounded-3xl p-5 
                  flex flex-col animate-rise shadow-sm hover:shadow-md hover:border-[var(--ink-3)] 
                  transition-all duration-300
                "
                style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
              >
                {/* Top Row: Avatar & Status */}
                <div className="flex items-start justify-between mb-4">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--surface-2)] to-[var(--line)] border border-[var(--line)] flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300">
                      <span className="dot-num text-2xl text-[var(--ink)]">{initialOf(c.display_name)}</span>
                    </div>
                    {/* Active Status Dot */}
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[var(--green)] border-2 border-[var(--surface)] shadow-sm" />
                  </div>
                  
                  <div className="px-2.5 py-1 rounded-full bg-[var(--surface-2)] border border-[var(--line)] text-[9px] font-bold uppercase tracking-wider text-[var(--ink-3)]">
                    Coordinator
                  </div>
                </div>

                {/* Info Row */}
                <div className="min-w-0">
                  <h3 className="font-bold text-xl truncate leading-tight group-hover:text-[var(--accent)] transition-colors">
                    {c.display_name}
                  </h3>
                  <div className="text-[11px] text-[var(--ink-3)] font-mono truncate mt-1">
                    {c.email || `ID: ${c.id.slice(0, 8).toUpperCase()}`}
                  </div>
                </div>

                {/* Bottom decorative line */}
                <div className="mt-5 pt-4 border-t border-[var(--line)] flex items-center justify-between opacity-60 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-3)]">Access Granted</span>
                  <Fingerprint size={16} className="text-[var(--ink-3)]" />
                </div>
              </div>
            ))}

            {list.length === 0 && (
              <div className="col-span-1 sm:col-span-2 lg:col-span-3 py-24 text-center bg-[var(--surface)] border border-dashed border-[var(--line)] rounded-3xl animate-rise">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--surface-2)] mb-5 text-[var(--ink-3)]">
                  <Fingerprint size={28} />
                </div>
                <h3 className="font-bold text-xl mb-1">No coordinators yet</h3>
                <p className="text-[var(--ink-3)] text-sm max-w-xs mx-auto">
                  Your staff directory is empty. Tap "Add Staff" to create the first account.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* ================= CENTERED CREATE MODAL ================= */}
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="bg-[var(--surface)] w-full max-w-md rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-scale-in border border-[var(--line)] relative">
              
              {/* Decorative Mesh Background in Header */}
              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-[var(--accent-soft)] to-transparent opacity-50 pointer-events-none" />

              {/* Modal Header */}
              <div className="relative p-6 border-b border-[var(--line)] flex-shrink-0 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <UserPlus size={20} className="text-[var(--accent)]" /> Add Coordinator
                  </h3>
                  <p className="text-[11px] text-[var(--ink-3)] mt-1 font-mono uppercase tracking-wider">Generate secure access</p>
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
                  <label className="label block mb-2 text-[var(--ink-2)]">Display Name</label>
                  <div className="relative">
                    <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-3)] pointer-events-none" size={18} />
                    <input 
                      autoFocus 
                      className="input !pl-12" 
                      placeholder="e.g. Ravi Kumar" 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="label text-[var(--ink-2)]">Unique PIN</label>
                    <span className="label text-[var(--accent)] bg-[var(--accent-soft)] px-2 py-0.5 rounded-sm">Max 10 Digits</span>
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-3)] pointer-events-none" size={18} />
                    <input 
                      className="input !pl-12 !pr-16 font-mono tracking-[0.3em] text-lg" 
                      type="text" 
                      inputMode="numeric"
                      placeholder="000000" 
                      value={pin} 
                      onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[var(--ink-3)] bg-[var(--surface-2)] px-2 py-1 rounded">
                      {pin.length}/10
                    </div>
                  </div>
                  <p className="text-[10px] text-[var(--ink-3)] mt-2 flex items-center gap-1">
                    <ShieldCheck size={12} /> This PIN will be used by the coordinator to log in.
                  </p>
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
                  onClick={create}
                  disabled={!name.trim() || pin.length < 4}
                >
                  <Check size={18} /> Create Account
                </button>
              </div>
            </div>
          </div>
        )}
        
      </div>
    </AdminLayout>
  );
}