import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/AdminLayout';
import { useToast } from '../../components/Toast';
import type { EventSettings } from '../../types';
import { 
  Save, Award, Trophy, AlertTriangle, 
  Lock, Unlock, Settings2, CheckCircle2 
} from 'lucide-react';

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

export default function Settings() {
  const [s, setS] = useState<EventSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { show } = useToast();

  async function load() {
    const { data } = await supabase.from('event_settings').select('*').eq('id', 1).single();
    setS(data as EventSettings);
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!s || isSaving) return;
    setIsSaving(true);
    const { error } = await supabase
      .from('event_settings')
      .update({
        general_threshold: s.general_threshold,
        grand_threshold: s.grand_threshold,
        near_grand_threshold: s.near_grand_threshold,
        entry_closed: s.entry_closed,
        claims_closed: s.claims_closed,
      })
      .eq('id', 1);
      
    if (error) {
      show(error.message, true);
      setIsSaving(false);
      return;
    }
    
    show('Settings saved successfully');
    setTimeout(() => setIsSaving(false), 800); // keep loading state briefly for feedback
  }

  if (!s) return null;

  return (
    <AdminLayout>
      <style>{STYLES}</style>
      
      <div className="relative min-h-[100dvh] bg-[var(--bg)] text-[var(--ink)] flex flex-col">
        {/* Fixed dot-grid canvas */}
        <div
          className="fixed inset-0 pointer-events-none opacity-50"
          style={{
            backgroundImage: 'radial-gradient(circle, var(--line) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
          aria-hidden="true"
        />

        {/* Added pb-32 to ensure content never hides behind the sticky save button */}
        <div className="relative flex flex-col flex-1 w-full max-w-5xl mx-auto px-4 md:px-8 pt-6 md:pt-8 pb-32">
          
          {/* Header */}
          <header className="flex-shrink-0 mb-8 animate-rise">
            <div className="flex items-center gap-2 mb-1">
              <Settings2 size={18} className="text-[var(--accent)]" />
              <span className="label text-[var(--ink-3)]">Configuration</span>
            </div>
            <h1 className="dot-num text-3xl sm:text-4xl tracking-wide">EVENT SETTINGS</h1>
            <p className="text-[var(--ink-2)] text-sm sm:text-base mt-1">
              Configure thresholds and lock down event phases.
            </p>
          </header>

          {/* Grid Layout: 7 columns for thresholds, 5 columns for system status */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 animate-rise" style={{ animationDelay: '60ms' }}>
            
            {/* LEFT COLUMN: Thresholds */}
            <div className="lg:col-span-7 space-y-4">
              <div className="label px-1 mb-2">Prize Thresholds</div>
              
              {/* General Threshold */}
              <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 shadow-sm group hover:border-[var(--amber)] transition-colors flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--amber)]/10 flex items-center justify-center text-[var(--amber)] flex-shrink-0">
                    <Award size={18} />
                  </div>
                  <div>
                    <label className="label text-[var(--ink)]">General Prize</label>
                    <div className="text-[11px] text-[var(--ink-3)] mt-0.5">Total wins required</div>
                  </div>
                </div>
                <div className="relative w-32 flex-shrink-0">
                  <input
                    className="w-full h-12 bg-[var(--surface-2)] border border-[var(--line)] rounded-xl px-4 pr-12 text-lg font-bold text-[var(--ink)] outline-none focus:border-[var(--amber)] transition-colors text-right"
                    type="number"
                    value={s.general_threshold}
                    onChange={(e) => setS({ ...s, general_threshold: parseInt(e.target.value) || 0 })}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-mono text-[var(--ink-3)] uppercase tracking-wider">
                    Wins
                  </span>
                </div>
              </div>

              {/* Grand Threshold */}
              <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 shadow-sm group hover:border-[var(--green)] transition-colors flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--green)]/10 flex items-center justify-center text-[var(--green)] flex-shrink-0">
                    <Trophy size={18} />
                  </div>
                  <div>
                    <label className="label text-[var(--ink)]">Grand Prize</label>
                    <div className="text-[11px] text-[var(--ink-3)] mt-0.5">Distinct games required</div>
                  </div>
                </div>
                <div className="relative w-32 flex-shrink-0">
                  <input
                    className="w-full h-12 bg-[var(--surface-2)] border border-[var(--line)] rounded-xl px-4 pr-12 text-lg font-bold text-[var(--ink)] outline-none focus:border-[var(--green)] transition-colors text-right"
                    type="number"
                    value={s.grand_threshold}
                    onChange={(e) => setS({ ...s, grand_threshold: parseInt(e.target.value) || 0 })}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-mono text-[var(--ink-3)] uppercase tracking-wider">
                    Games
                  </span>
                </div>
              </div>

              {/* Near-Grand Threshold */}
              <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 shadow-sm group hover:border-[var(--accent)] transition-colors flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] flex-shrink-0">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <label className="label text-[var(--ink)]">Near-Grand Warning</label>
                    <div className="text-[11px] text-[var(--ink-3)] mt-0.5">Dashboard alert threshold</div>
                  </div>
                </div>
                <div className="relative w-32 flex-shrink-0">
                  <input
                    className="w-full h-12 bg-[var(--surface-2)] border border-[var(--line)] rounded-xl px-4 pr-12 text-lg font-bold text-[var(--ink)] outline-none focus:border-[var(--accent)] transition-colors text-right"
                    type="number"
                    value={s.near_grand_threshold}
                    onChange={(e) => setS({ ...s, near_grand_threshold: parseInt(e.target.value) || 0 })}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-mono text-[var(--ink-3)] uppercase tracking-wider">
                    Games
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: System Toggles */}
            <div className="lg:col-span-5 space-y-4">
              <div className="label px-1 mb-2">System Status</div>

              <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-sm overflow-hidden flex flex-col">
                
                {/* Close New Entries Toggle */}
                <div 
                  className="p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-[var(--surface-2)] transition-colors"
                  onClick={() => setS({ ...s, entry_closed: !s.entry_closed })}
                >
                  <div className="flex gap-3">
                    <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${s.entry_closed ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'bg-[var(--green)]/10 text-[var(--green)]'}`}>
                      {s.entry_closed ? <Lock size={16} /> : <Unlock size={16} />}
                    </div>
                    <div>
                      <div className="font-bold text-[15px] leading-tight">Close New Entries</div>
                      <div className="text-[11px] text-[var(--ink-3)] mt-1 leading-snug">
                        Coordinators cannot add new wins.
                      </div>
                    </div>
                  </div>
                  
                  {/* Premium Toggle Switch */}
                  <div className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 flex-shrink-0 ${s.entry_closed ? 'bg-[var(--accent)]' : 'bg-[var(--line)]'}`}>
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${s.entry_closed ? 'translate-x-[22px]' : 'translate-x-1'}`} />
                  </div>
                </div>

                <div className="h-px bg-[var(--line)] mx-5" />

                {/* Close Prize Claims Toggle */}
                <div 
                  className="p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-[var(--surface-2)] transition-colors"
                  onClick={() => setS({ ...s, claims_closed: !s.claims_closed })}
                >
                  <div className="flex gap-3">
                    <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${s.claims_closed ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'bg-[var(--green)]/10 text-[var(--green)]'}`}>
                      {s.claims_closed ? <Lock size={16} /> : <Unlock size={16} />}
                    </div>
                    <div>
                      <div className="font-bold text-[15px] leading-tight">Close Prize Claims</div>
                      <div className="text-[11px] text-[var(--ink-3)] mt-1 leading-snug">
                        Prize desk cannot mark prizes as claimed.
                      </div>
                    </div>
                  </div>
                  
                  {/* Premium Toggle Switch */}
                  <div className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 flex-shrink-0 ${s.claims_closed ? 'bg-[var(--accent)]' : 'bg-[var(--line)]'}`}>
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${s.claims_closed ? 'translate-x-[22px]' : 'translate-x-1'}`} />
                  </div>
                </div>

              </div>
              
              {/* Warning Banner if anything is closed */}
              {(s.entry_closed || s.claims_closed) && (
                <div className="bg-[var(--accent-soft)] border border-[var(--accent)]/20 rounded-2xl p-4 flex gap-3 text-[var(--accent)] animate-rise">
                  <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                  <div className="text-[11px] font-semibold leading-relaxed">
                    System features are locked. Staff members will be blocked from performing these actions.
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Floating Sticky Save Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
          <div className="bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/90 to-transparent pt-12 pb-6 px-4">
            <div className="max-w-md mx-auto pointer-events-auto">
              <button 
                className="
                  w-full h-14 rounded-full
                  inline-flex items-center justify-center gap-2
                  bg-[var(--ink)] text-[var(--bg)]
                  text-sm font-bold uppercase tracking-[0.08em]
                  active:scale-[0.98] transition-transform
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]
                  shadow-xl hover:shadow-2xl
                "
                style={{ fontFamily: 'var(--font-mono)' }}
                onClick={save}
                disabled={isSaving}
              >
                {isSaving ? (
                  <><CheckCircle2 size={18} className="animate-pulse" /> Saving Changes…</>
                ) : (
                  <><Save size={18} /> Save Settings</>
                )}
              </button>
            </div>
          </div>
        </div>
        
      </div>
    </AdminLayout>
  );
}