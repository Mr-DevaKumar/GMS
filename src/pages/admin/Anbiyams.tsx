import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/AdminLayout';
import { useToast } from '../../components/Toast';
import type { Anbiyam } from '../../types';
import { Plus, X, Hash, Network, Layers } from 'lucide-react';

const STYLES = `
  @keyframes rise {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .animate-rise { animation: rise 0.5s cubic-bezier(0.2,0.8,0.2,1) both; }

  @media (prefers-reduced-motion: reduce) {
    .animate-rise { animation: none !important; }
  }
`;

function initialOf(name?: string) {
  return (name || '?').trim().charAt(0).toUpperCase();
}

export default function Anbiyams() {
  const [list, setList] = useState<Anbiyam[]>([]);
  const [name, setName] = useState('');
  const { show } = useToast();

  async function load() {
    const { data } = await supabase.from('anbiyams').select('*').order('name');
    setList((data || []) as Anbiyam[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function add() {
    if (!name.trim()) return;
    const { error } = await supabase.from('anbiyams').insert({ name: name.trim() });
    if (error) return show(error.message, true);
    setName('');
    show('Anbiyam added');
    load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from('anbiyams').delete().eq('id', id);
    if (error) return show(error.message, true);
    show('Anbiyam removed');
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

        <div className="relative p-4 md:p-8 max-w-4xl mx-auto pb-20">
          
          {/* Header */}
          <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 animate-rise">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Network size={18} className="text-[var(--accent)]" />
                <span className="label text-[var(--ink-3)]">Community Groups</span>
              </div>
              <h1 className="dot-num text-3xl sm:text-4xl tracking-wide">ANBIYAMS</h1>
              <p className="text-[var(--ink-2)] text-sm sm:text-base mt-1">
                Manage the community groups for this event.
              </p>
            </div>
          </header>

          {/* Add Form (Command Bar) */}
          <div 
            className="bg-[var(--surface)] border border-[var(--line)] rounded-3xl p-2 sm:p-3 mb-10 shadow-sm flex flex-col sm:flex-row gap-2 animate-rise"
            style={{ animationDelay: '60ms' }}
          >
            <div className="relative flex-1">
              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-3)] pointer-events-none" size={18} />
              <input
                className="input !pl-12 !border-transparent !bg-transparent focus:!border-[var(--ink)] transition-colors h-14"
                placeholder="Type a new Anbiyam name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && add()}
              />
            </div>
            <button 
              className="
                h-14 px-6 rounded-2xl sm:rounded-xl
                inline-flex items-center justify-center gap-2
                bg-[var(--ink)] text-[var(--bg)]
                text-sm font-bold uppercase tracking-[0.08em]
                active:scale-[0.98] transition-transform
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]
                disabled:opacity-40 disabled:cursor-not-allowed
              " 
              style={{ fontFamily: 'var(--font-mono)' }}
              onClick={add}
              disabled={!name.trim()}
            >
              <Plus size={18} /> Add
            </button>
          </div>

          {/* Anbiyams Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {list.map((a, i) => (
              <div 
                key={a.id} 
                className="
                  group relative bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-4 
                  flex items-center justify-between animate-rise shadow-sm hover:shadow-md 
                  hover:border-[var(--ink-3)] transition-all duration-300
                "
                style={{ animationDelay: `${Math.min(i * 40, 300)}ms` }}
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  {/* Gradient Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--surface-2)] to-[var(--line)] border border-[var(--line)] flex items-center justify-center flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-300">
                    <span className="dot-num text-sm text-[var(--ink)]">{initialOf(a.name)}</span>
                  </div>
                  <span className="font-bold text-[15px] truncate leading-tight group-hover:text-[var(--accent)] transition-colors">
                    {a.name}
                  </span>
                </div>
                
                {/* Delete Button */}
                <button 
                  onClick={() => remove(a.id)} 
                  className="
                    w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                    bg-[var(--surface-2)] text-[var(--ink-3)] 
                    hover:text-[var(--accent)] hover:bg-[var(--accent-soft)]
                    active:scale-90 transition-all opacity-50 group-hover:opacity-100
                  "
                  title="Remove Anbiyam"
                >
                  <X size={15} strokeWidth={2.5} />
                </button>
              </div>
            ))}

            {list.length === 0 && (
              <div className="col-span-1 sm:col-span-2 md:col-span-3 py-20 text-center bg-[var(--surface)] border border-dashed border-[var(--line)] rounded-3xl animate-rise">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--surface-2)] mb-5 text-[var(--ink-3)]">
                  <Layers size={28} />
                </div>
                <h3 className="font-bold text-xl mb-1">No Anbiyams yet</h3>
                <p className="text-[var(--ink-3)] text-sm max-w-xs mx-auto">
                  Type a name above to add your first community group.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </AdminLayout>
  );
}