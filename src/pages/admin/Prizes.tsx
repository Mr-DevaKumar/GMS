import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/AdminLayout';
import { useToast } from '../../components/Toast';
import type { EventSettings, PlayerStat } from '../../types';
import { 
  Search, Trophy, CheckCircle2, Clock, X, Award, 
  Sparkles, ArrowRight, Trash2, AlertTriangle 
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

export default function Prizes() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlayerStat[]>([]);
  const [selected, setSelected] = useState<PlayerStat | null>(null);
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [claimingType, setClaimingType] = useState<'general' | 'grand' | null>(null);
  const [recentClaims, setRecentClaims] = useState<any[]>([]);
  const [isClaiming, setIsClaiming] = useState(false);
  
  // Revoke State
  const [revokingClaim, setRevokingClaim] = useState<any | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const { show } = useToast();

  useEffect(() => {
    loadSettings();
    loadRecentClaims();
  }, []);

  async function loadSettings() {
    const { data } = await supabase.from('event_settings').select('*').eq('id', 1).single();
    setSettings(data as EventSettings);
  }

  async function loadRecentClaims() {
    const { data } = await supabase
      .from('prize_claims')
      .select('id, prize_type, claimed_at, players(name)')
      .order('claimed_at', { ascending: false })
      .limit(15);
    setRecentClaims(data || []);
  }

  async function search() {
    if (!query.trim()) return;
    const { data } = await supabase.from('v_player_prize_stats').select('*').ilike('name', `%${query.trim()}%`).limit(10);
    setResults((data || []) as PlayerStat[]);
  }

  async function select(p: PlayerStat) {
    setSelected(p);
    setResults([]);
    setQuery('');
  }

  async function confirmClaim() {
    if (!selected || !claimingType) return;
    setIsClaiming(true);
    
    const { error } = await supabase.rpc('claim_prize', { p_player_id: selected.id, p_prize_type: claimingType });
    
    if (error) {
      show(error.message, true);
      setIsClaiming(false);
    } else {
      show('Prize claimed successfully');
      const { data } = await supabase.from('v_player_prize_stats').select('*').eq('id', selected.id).single();
      if (data) setSelected(data as PlayerStat);
      loadRecentClaims();
      setClaimingType(null);
      setIsClaiming(false);
    }
  }

  async function confirmRevoke() {
    if (!revokingClaim) return;
    setIsRevoking(true);
    
    const { error } = await supabase.rpc('revoke_prize_claim', { p_claim_id: revokingClaim.id });
    
    if (error) {
      show(error.message, true);
    } else {
      show('Claim revoked successfully');
      // If the revoked claim belongs to the currently selected player, refresh their stats
      if (selected) {
        const { data } = await supabase.from('v_player_prize_stats').select('*').eq('id', selected.id).single();
        if (data) setSelected(data as PlayerStat);
      }
      loadRecentClaims();
      setRevokingClaim(null);
    }
    setIsRevoking(false);
  }

  const genEligible = selected && settings && selected.total_wins >= settings.general_threshold;
  const grandEligible = selected && settings && selected.distinct_games >= settings.grand_threshold;

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

        <div className="relative flex flex-col flex-1 min-h-0 w-full max-w-6xl mx-auto px-4 md:px-8">
          
          <header className="flex-shrink-0 pt-6 md:pt-8 pb-6 animate-rise">
            <div className="flex items-center gap-2 mb-1">
              <Trophy size={18} className="text-[var(--amber)]" />
              <span className="label text-[var(--ink-3)]">Redemption Center</span>
            </div>
            <h1 className="dot-num text-3xl sm:text-4xl tracking-wide">PRIZE DESK</h1>
            <p className="text-[var(--ink-2)] text-sm sm:text-base mt-1">
              Verify players and process prize claims.
            </p>
          </header>

          <div className="flex-1 overflow-y-auto no-scrollbar min-h-0 pb-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
              
              {/* LEFT COLUMN: Search & Action */}
              <div className="lg:col-span-7 space-y-6">
                
                <div className="relative z-20 animate-rise" style={{ animationDelay: '60ms' }}>
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-3)] pointer-events-none" size={20} />
                  <input
                    className="input !pl-12 !pr-12 !h-14 !rounded-2xl shadow-sm"
                    placeholder="Search player by name..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && search()}
                  />
                  {query.length > 0 && (
                    <button
                      onClick={() => { setQuery(''); setResults([]); }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-[var(--ink-3)] hover:bg-[var(--surface-2)] transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}

                  {results.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-xl overflow-hidden animate-scale-in z-30 max-h-[50vh] overflow-y-auto no-scrollbar">
                      {results.map(r => (
                        <button 
                          key={r.id} 
                          onClick={() => select(r)} 
                          className="w-full text-left px-4 py-3 border-b border-[var(--line)] last:border-0 hover:bg-[var(--surface-2)] transition-colors flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center flex-shrink-0 text-xs font-bold text-[var(--ink-2)]">
                              {initialOf(r.name)}
                            </div>
                            <div>
                              <div className="font-bold text-[15px]">{r.name}</div>
                              <div className="text-[11px] font-mono text-[var(--ink-3)]">{r.age} yrs · {r.anbiyam || '—'}</div>
                            </div>
                          </div>
                          <ArrowRight size={16} className="text-[var(--ink-3)] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selected && settings ? (
                  <div className="animate-rise">
                    <div className="bg-[var(--surface)] border border-[var(--line)] rounded-3xl p-6 shadow-sm relative overflow-hidden mb-4">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[var(--amber)]/10 to-transparent rounded-bl-full pointer-events-none" />
                      
                      <div className="flex justify-between items-start mb-6 relative">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--ink)] to-[var(--ink-2)] flex items-center justify-center shadow-lg">
                            <span className="dot-num text-2xl text-[var(--bg)]">{initialOf(selected.name)}</span>
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold leading-tight">{selected.name}</h2>
                            <p className="text-[11px] text-[var(--ink-3)] font-mono mt-1">
                              {selected.age} yrs · Anbiyam {selected.anbiyam || '—'}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setSelected(null)} 
                          className="w-8 h-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 relative">
                        <div className={`relative overflow-hidden p-5 rounded-2xl border transition-all ${genEligible ? 'border-[var(--amber)] bg-[var(--amber)]/5' : 'border-[var(--line)] bg-[var(--surface-2)] opacity-80'}`}>
                          <div className="flex items-center gap-2 mb-3">
                            <Award size={16} className={genEligible ? 'text-[var(--amber)]' : 'text-[var(--ink-3)]'} />
                            <span className="label text-[var(--ink-2)]">General Prize</span>
                          </div>
                          <div className="flex items-end gap-1.5 mb-3">
                            <span className="dot-num text-4xl leading-none">{selected.total_wins}</span>
                            <span className="text-[10px] font-mono text-[var(--ink-3)] mb-1 uppercase tracking-wider">Wins</span>
                          </div>
                          <div className={`text-[11px] font-bold flex items-center gap-1.5 ${genEligible ? 'text-[var(--amber)]' : 'text-[var(--ink-3)]'}`}>
                            {genEligible ? (
                              <><CheckCircle2 size={13} /> Eligible to claim</>
                            ) : (
                              <>Needs {settings.general_threshold - selected.total_wins} more wins</>
                            )}
                          </div>
                        </div>

                        <div className={`relative overflow-hidden p-5 rounded-2xl border transition-all ${grandEligible ? 'border-[var(--green)] bg-[var(--green)]/5' : 'border-[var(--line)] bg-[var(--surface-2)] opacity-80'}`}>
                          <div className="flex items-center gap-2 mb-3">
                            <Trophy size={16} className={grandEligible ? 'text-[var(--green)]' : 'text-[var(--ink-3)]'} />
                            <span className="label text-[var(--ink-2)]">Grand Prize</span>
                          </div>
                          <div className="flex items-end gap-1.5 mb-3">
                            <span className="dot-num text-4xl leading-none">{selected.distinct_games}</span>
                            <span className="text-[10px] font-mono text-[var(--ink-3)] mb-1 uppercase tracking-wider">Games</span>
                          </div>
                          <div className={`text-[11px] font-bold flex items-center gap-1.5 ${grandEligible ? 'text-[var(--green)]' : 'text-[var(--ink-3)]'}`}>
                            {grandEligible ? (
                              <><CheckCircle2 size={13} /> Eligible to claim</>
                            ) : (
                              <>Needs {settings.grand_threshold - selected.distinct_games} more games</>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <button
                        className="w-full h-14 rounded-2xl inline-flex items-center justify-center gap-2 bg-[var(--ink)] text-[var(--bg)] text-sm font-bold uppercase tracking-[0.08em] active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-30 disabled:cursor-not-allowed shadow-lg"
                        style={{ fontFamily: 'var(--font-mono)' }}
                        disabled={!genEligible || settings.claims_closed}
                        onClick={() => setClaimingType('general')}
                      >
                        <Award size={18} /> Mark General Claimed
                      </button>
                      <button
                        className="w-full h-14 rounded-2xl inline-flex items-center justify-center gap-2 bg-[var(--accent)] text-white text-sm font-bold uppercase tracking-[0.08em] active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-[var(--accent)]/20"
                        style={{ fontFamily: 'var(--font-mono)' }}
                        disabled={!grandEligible || settings.claims_closed}
                        onClick={() => setClaimingType('grand')}
                      >
                        <Trophy size={18} /> Mark Grand Claimed
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="hidden lg:flex flex-col items-center justify-center py-20 text-center bg-[var(--surface)] border border-dashed border-[var(--line)] rounded-3xl animate-rise">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--surface-2)] mb-4 text-[var(--ink-3)]">
                      <Search size={28} />
                    </div>
                    <h3 className="font-bold text-lg mb-1">Find a Player</h3>
                    <p className="text-[var(--ink-3)] text-sm max-w-xs">
                      Type a name in the search bar above to verify their eligibility and process prizes.
                    </p>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: Recent Claims */}
              <div className="lg:col-span-5 animate-rise" style={{ animationDelay: '120ms' }}>
                <div className="flex items-center gap-2 mb-4 px-1">
                  <Clock size={16} className="text-[var(--ink-3)]" />
                  <h2 className="label text-[var(--ink-2)]">Recent Prize Claims</h2>
                </div>
                
                {recentClaims.length === 0 ? (
                  <div className="bg-[var(--surface)] border border-dashed border-[var(--line)] rounded-3xl py-16 text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--surface-2)] mb-4 text-[var(--ink-3)]">
                      <Sparkles size={24} />
                    </div>
                    <h3 className="font-bold text-lg mb-1">No claims yet</h3>
                    <p className="text-[var(--ink-3)] text-sm max-w-xs mx-auto">
                      Recent redemptions will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {recentClaims.map((c) => (
                      <div 
                        key={c.id} 
                        className="group bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-4 flex justify-between items-center shadow-sm hover:border-[var(--ink-3)] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center flex-shrink-0 text-xs font-bold text-[var(--ink-2)]">
                            {initialOf(c.players?.name)}
                          </div>
                          <div>
                            <div className="font-bold text-[15px] leading-tight">{c.players?.name || 'Unknown'}</div>
                            <div className="text-[10px] font-mono mt-0.5">
                              {c.prize_type === 'grand' ? (
                                <span className="text-[var(--green)] font-bold uppercase tracking-wider">🏆 Grand Prize</span>
                              ) : (
                                <span className="text-[var(--amber)] font-bold uppercase tracking-wider">⭐ General Prize</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="text-[10px] text-[var(--ink-3)] font-mono text-right tabular-nums">
                            {new Date(c.claimed_at).toLocaleDateString()}<br/>
                            {new Date(c.claimed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <button 
                            onClick={() => setRevokingClaim(c)}
                            className="p-2 text-[var(--ink-3)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] rounded-full transition-colors opacity-50 group-hover:opacity-100"
                            title="Revoke Claim"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
            </div>
          </div>
        </div>

        {/* ================= CLAIM MODAL ================= */}
        {claimingType && selected && settings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="bg-[var(--surface)] w-full max-w-md rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-scale-in border border-[var(--line)] relative">
              <div className={`absolute top-0 left-0 right-0 h-32 opacity-20 pointer-events-none ${claimingType === 'grand' ? 'bg-gradient-to-br from-[var(--green)] to-transparent' : 'bg-gradient-to-br from-[var(--amber)] to-transparent'}`} />
              <div className="relative p-6 border-b border-[var(--line)] flex-shrink-0 flex items-center justify-between">
                <div>
                  <h3 className={`text-xl font-bold flex items-center gap-2 ${claimingType === 'grand' ? 'text-[var(--green)]' : 'text-[var(--amber)]'}`}>
                    {claimingType === 'grand' ? <Trophy size={20} /> : <Award size={20} />}
                    Confirm {claimingType === 'grand' ? 'Grand' : 'General'} Claim
                  </h3>
                  <p className="text-[11px] text-[var(--ink-3)] mt-1 font-mono uppercase tracking-wider">Verify deduction</p>
                </div>
                <button onClick={() => setClaimingType(null)} className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--surface-2)] text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--line)] active:scale-90 transition-all flex-shrink-0 z-10">
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 flex flex-col gap-5 relative">
                <div className="flex items-center gap-4 bg-[var(--surface-2)] p-4 rounded-2xl border border-[var(--line)]">
                  <div className="w-12 h-12 rounded-full bg-[var(--ink)] flex items-center justify-center flex-shrink-0">
                    <span className="dot-num text-lg text-[var(--bg)]">{initialOf(selected.name)}</span>
                  </div>
                  <div>
                    <div className="font-bold text-lg leading-tight">{selected.name}</div>
                    <div className="text-[11px] text-[var(--ink-3)] font-mono mt-0.5">{selected.age} yrs · {selected.anbiyam || '—'}</div>
                  </div>
                </div>
                <p className="text-sm text-[var(--ink-2)] leading-relaxed">
                  Are you sure you want to mark this prize as claimed? This will deduct <strong className="text-[var(--ink)]">{claimingType === 'grand' ? settings.grand_threshold : settings.general_threshold}</strong> from their available {claimingType === 'grand' ? 'games' : 'wins'}.
                </p>
                <button className="w-full h-14 rounded-2xl mt-2 inline-flex items-center justify-center gap-2 bg-[var(--ink)] text-[var(--bg)] text-sm font-bold uppercase tracking-[0.08em] active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-40 disabled:cursor-not-allowed shadow-lg" style={{ fontFamily: 'var(--font-mono)' }} onClick={confirmClaim} disabled={isClaiming}>
                  {isClaiming ? 'Processing…' : <><CheckCircle2 size={18} /> Confirm Claim</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= REVOKE MODAL ================= */}
        {revokingClaim && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="bg-[var(--surface)] w-full max-w-md rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-scale-in border border-[var(--line)] relative">
              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-[var(--accent-soft)] to-transparent opacity-50 pointer-events-none" />
              
              <div className="relative p-6 border-b border-[var(--line)] flex-shrink-0 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2 text-[var(--accent)]">
                    <AlertTriangle size={20} /> Revoke Claim
                  </h3>
                  <p className="text-[11px] text-[var(--ink-3)] mt-1 font-mono uppercase tracking-wider">Restore player's balance</p>
                </div>
                <button onClick={() => setRevokingClaim(null)} className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--surface-2)] text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--line)] active:scale-90 transition-all flex-shrink-0 z-10">
                  <X size={18} />
                </button>
              </div>
              
              <div className="p-6 flex flex-col gap-5 relative">
                <div className="flex items-center gap-4 bg-[var(--surface-2)] p-4 rounded-2xl border border-[var(--line)]">
                  <div className="w-12 h-12 rounded-full bg-[var(--ink)] flex items-center justify-center flex-shrink-0">
                    <span className="dot-num text-lg text-[var(--bg)]">{initialOf(revokingClaim.players?.name)}</span>
                  </div>
                  <div>
                    <div className="font-bold text-lg leading-tight">{revokingClaim.players?.name || 'Unknown'}</div>
                    <div className="text-[11px] text-[var(--ink-3)] font-mono mt-0.5 uppercase tracking-wider">
                      {revokingClaim.prize_type === 'grand' ? 'Grand Prize Claim' : 'General Prize Claim'}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-[var(--ink-2)] leading-relaxed">
                  Are you sure you want to revoke this claim? The player's spent wins will be refunded to their available balance immediately, and this action will be logged in the audit trail.
                </p>
                
                <button 
                  className="w-full h-14 rounded-2xl mt-2 inline-flex items-center justify-center gap-2 bg-[var(--accent)] text-white text-sm font-bold uppercase tracking-[0.08em] active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[var(--accent)]/20" 
                  style={{ fontFamily: 'var(--font-mono)' }}
                  onClick={confirmRevoke}
                  disabled={isRevoking}
                >
                  {isRevoking ? 'Revoking…' : <><Trash2 size={18} /> Confirm Revoke</>}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
