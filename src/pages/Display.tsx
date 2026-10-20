import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { PlayerStat } from '../types';
import { Trophy, Flame, Gamepad2, Star } from 'lucide-react';

const STYLES = `
  @keyframes rise {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .animate-rise { animation: rise 0.6s cubic-bezier(0.2,0.8,0.2,1) both; }

  @keyframes pulse-ring {
    0% { transform: scale(0.8); opacity: 1; }
    100% { transform: scale(2.5); opacity: 0; }
  }
  .animate-pulse-ring { animation: pulse-ring 2s cubic-bezier(0, 0, 0.2, 1) infinite; }

  .glass-panel {
    background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 100%);
    border: 1px solid rgba(255,255,255,0.08);
    box-shadow: inset 0 1px 1px rgba(255,255,255,0.1), 0 20px 40px rgba(0,0,0,0.6);
    backdrop-filter: blur(16px);
  }

  .inner-pill {
    background: linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 100%);
    box-shadow: inset 0 2px 4px rgba(255,255,255,0.1), inset 0 -2px 4px rgba(0,0,0,0.5), 0 4px 10px rgba(0,0,0,0.3);
    border: 1px solid rgba(255,255,255,0.1);
  }

  .row-slot {
    background: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%);
    border: 1px solid rgba(255,255,255,0.03);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
  }

  .gold-capsule {
    background: linear-gradient(90deg, rgba(255,215,0,0.15) 0%, rgba(255,255,255,0.05) 50%, rgba(255,215,0,0.05) 100%);
    border: 1px solid rgba(255,215,0,0.3);
    box-shadow: inset 0 0 20px rgba(255,215,0,0.05), 0 0 20px rgba(255,215,0,0.15);
  }
  
  .silver-capsule {
    background: linear-gradient(90deg, rgba(192,192,192,0.12) 0%, rgba(255,255,255,0.03) 50%, rgba(192,192,192,0.05) 100%);
    border: 1px solid rgba(192,192,192,0.2);
    box-shadow: inset 0 0 15px rgba(192,192,192,0.05), 0 0 15px rgba(192,192,192,0.1);
  }

  .bronze-capsule {
    background: linear-gradient(90deg, rgba(205,127,50,0.12) 0%, rgba(255,255,255,0.03) 50%, rgba(205,127,50,0.05) 100%);
    border: 1px solid rgba(205,127,50,0.2);
    box-shadow: inset 0 0 15px rgba(205,127,50,0.05), 0 0 15px rgba(205,127,50,0.1);
  }

  .dark-capsule {
    background: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%);
    border: 1px solid rgba(255,255,255,0.05);
  }

  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .no-scrollbar::-webkit-scrollbar { display: none; }

  @media (prefers-reduced-motion: reduce) {
    .animate-rise, .animate-pulse-ring { animation: none !important; }
  }
`;

export default function Display() {
  const [counts, setCounts] = useState<{ name: string; wins: number }[]>([]);
  const [top, setTop] = useState<PlayerStat[]>([]);

  async function load() {
    const [g, p] = await Promise.all([
      supabase.from('v_game_winner_counts').select('*').order('wins', { ascending: false }),
      supabase
        .from('v_player_stats')
        .select('*')
        .order('distinct_games', { ascending: false })
        .order('total_wins', { ascending: false })
        .limit(10),
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
    <div className="relative min-h-[100dvh] bg-[#0a0a0c] text-white overflow-hidden font-sans selection:bg-[#ff3b43]/30">
      <style>{STYLES}</style>

      {/* Ambient Background Texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.15]"
        style={{
          backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vh] bg-[#ffd700]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vh] bg-[#ff3b43]/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 flex flex-col h-[100dvh] max-w-[1600px] mx-auto p-6 md:p-10 lg:p-12">
        
        {/* Header */}
        <header className="flex-shrink-0 flex flex-col md:flex-row items-center justify-between gap-6 mb-8 md:mb-12 animate-rise">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-3 shadow-sm backdrop-blur-md">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#ff3b43] opacity-75 animate-pulse-ring" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#ff3b43]" />
              </span>
              <span className="text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase text-white/90 font-mono">
                Live Leaderboard
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 font-black uppercase" style={{ fontFamily: 'var(--font-mono)' }}>
              Mission Sunday
            </h1>
          </div>

          {/* Decorative Badge */}
          <div className="hidden lg:flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 shadow-lg backdrop-blur-md">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#ffd700] to-[#ff8c00] flex items-center justify-center text-black shadow-[0_0_20px_rgba(255,215,0,0.4)]">
              <Trophy size={24} />
            </div>
            <div>
              <div className="text-[10px] font-mono text-white/50 uppercase tracking-wider">Event Status</div>
              <div className="font-bold text-lg text-white">In Progress</div>
            </div>
          </div>
        </header>

        {/* Content Grid */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* LEFT: Top Players (Leaderboard Panel) */}
          <div className="lg:col-span-7 flex flex-col min-h-0 animate-rise" style={{ animationDelay: '100ms' }}>
            
            {/* Main Glass Container */}
            <div className="glass-panel rounded-[2.5rem] p-4 md:p-6 flex flex-col flex-1 min-h-0">
              
              {/* Leaderboard Title Pill */}
              <div className="flex-shrink-0 flex justify-center mb-6 mt-2">
                <div className="inner-pill px-10 py-3 rounded-full flex items-center gap-3">
                  <Star size={20} className="text-[#ffd700] fill-[#ffd700]" />
                  <h2 className="text-xl md:text-3xl font-bold tracking-[0.3em] text-white uppercase" style={{ fontFamily: 'var(--font-mono)' }}>
                    Leaderboard
                  </h2>
                  <Star size={20} className="text-[#ffd700] fill-[#ffd700]" />
                </div>
              </div>

              {/* Scrollable Player List */}
              <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-2.5 pb-2">
                {top.map((p, i) => {
                  const isFirst = i === 0;
                  const isSecond = i === 1;
                  const isThird = i === 2;

                  let capsuleClass = "row-slot";
                  let trophyColor = "";
                  let rankColor = "text-white/40";
                  let TrophyIcon = null;

                  if (isFirst) {
                    capsuleClass = "gold-capsule";
                    trophyColor = "text-[#ffd700]";
                    rankColor = "text-[#ffd700]";
                    TrophyIcon = <Trophy size={20} className="text-[#ffd700] fill-[#ffd700] drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]" />;
                  } else if (isSecond) {
                    capsuleClass = "silver-capsule";
                    trophyColor = "text-[#c0c0c0]";
                    rankColor = "text-[#c0c0c0]";
                    TrophyIcon = <Trophy size={18} className="text-[#c0c0c0] fill-[#c0c0c0] drop-shadow-[0_0_8px_rgba(192,192,192,0.5)]" />;
                  } else if (isThird) {
                    capsuleClass = "bronze-capsule";
                    trophyColor = "text-[#cd7f32]";
                    rankColor = "text-[#cd7f32]";
                    TrophyIcon = <Trophy size={16} className="text-[#cd7f32] fill-[#cd7f32] drop-shadow-[0_0_8px_rgba(205,127,50,0.5)]" />;
                  }

                  // Generate star rating based on distinct games (max 5)
                  const starCount = Math.min(5, Math.max(1, Math.floor(p.distinct_games)));
                  const stars = Array(5).fill(0).map((_, idx) => (
                    <Star 
                      key={idx} 
                      size={12} 
                      className={idx < starCount ? "text-[#ffd700] fill-[#ffd700]" : "text-white/20"} 
                    />
                  ));

                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between px-4 py-3 md:px-6 md:py-4 rounded-full border transition-all ${capsuleClass}`}
                    >
                      {/* Left side: Rank, Name, Avatar */}
                      <div className="flex items-center gap-3 md:gap-5 min-w-0 flex-1">
                        <div className={`w-8 md:w-10 text-center font-mono font-bold text-lg md:text-xl ${rankColor}`}>
                          {String(i + 1).padStart(2, '0')}
                        </div>
                        
                        <div className="flex items-center gap-3 md:gap-4 min-w-0">
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            <span className="text-xs md:text-sm font-bold text-white">{p.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <div className="min-w-0 flex flex-col justify-center">
                            <div className="font-bold text-sm md:text-lg text-white truncate uppercase tracking-wide">
                              {p.name}
                            </div>
                            <div className="text-[9px] md:text-[10px] text-white/50 font-mono truncate uppercase tracking-wider">
                              {p.anbiyam || 'No Anbiyam'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right side: Stars, Scores */}
                      <div className="flex items-center gap-4 md:gap-8 flex-shrink-0 pl-2">
                        
                        {/* Stars */}
                        <div className="hidden sm:flex items-center gap-1">
                          {stars}
                        </div>

                        {/* Divider */}
                        <div className="w-px h-8 bg-white/10 hidden sm:block" />

                        {/* Games Won & Total Wins */}
                        <div className="flex items-center gap-4 md:gap-6">
                          <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1.5 md:gap-2">
                              {TrophyIcon}
                              <span className={`font-mono text-xl md:text-3xl font-bold ${trophyColor || 'text-white'}`}>
                                {p.distinct_games}
                              </span>
                            </div>
                            <span className="text-[8px] md:text-[9px] font-mono uppercase tracking-widest text-white/40 mt-0.5">
                              Games
                            </span>
                          </div>

                          <div className="flex flex-col items-end">
                            <div className="flex items-center h-[28px] md:h-[36px]">
                              <span className="font-mono text-sm md:text-xl font-bold text-white/70">
                                {p.total_wins || 0}
                              </span>
                            </div>
                            <span className="text-[8px] md:text-[9px] font-mono uppercase tracking-widest text-white/40 mt-0.5">
                              Wins
                            </span>
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
                {top.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-white/30">
                    <Gamepad2 size={48} className="mb-4 opacity-50" />
                    <p className="font-mono text-sm uppercase tracking-widest">Waiting for first win...</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Wins Per Game (Metallic Capsules) */}
          <div className="lg:col-span-5 flex flex-col min-h-0 animate-rise" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center justify-between mb-4 px-4">
              <div className="flex items-center gap-2">
                <Flame className="text-[#ff3b43]" size={20} />
                <h2 className="text-sm md:text-base font-bold uppercase tracking-[0.15em] text-white/70 font-mono">
                  Game Activity
                </h2>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-3 pb-4">
              {counts.map((c, index) => {
                let capsuleClass = "dark-capsule";
                let textColor = "text-white/80";
                let icon = null;

                if (index === 0) {
                  capsuleClass = "gold-capsule";
                  textColor = "text-[#ffd700]";
                  icon = <Trophy size={18} className="text-[#ffd700] fill-[#ffd700]" />;
                } else if (index === 1) {
                  capsuleClass = "silver-capsule";
                  textColor = "text-[#c0c0c0]";
                  icon = <Trophy size={16} className="text-[#c0c0c0] fill-[#c0c0c0]" />;
                } else if (index === 2) {
                  capsuleClass = "bronze-capsule";
                  textColor = "text-[#cd7f32]";
                  icon = <Trophy size={14} className="text-[#cd7f32] fill-[#cd7f32]" />;
                }

                return (
                  <div
                    key={c.name}
                    className={`relative flex items-center justify-between px-5 py-4 md:px-8 md:py-5 rounded-full border transition-all ${capsuleClass}`}
                  >
                    <div className="flex items-center gap-3 md:gap-4 min-w-0 pr-4">
                      <div className="w-8 flex justify-center flex-shrink-0">
                        {icon || <span className="text-xs font-mono font-bold text-white/30">{String(index + 1).padStart(2, '0')}</span>}
                      </div>
                      <span className="text-base md:text-xl font-bold text-white truncate drop-shadow-md">
                        {c.name}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 flex-shrink-0">
                      <span className={`font-mono text-2xl md:text-4xl font-bold ${textColor} drop-shadow-md`}>
                        {c.wins}
                      </span>
                      <span className="text-[9px] md:text-[10px] font-mono text-white/40 uppercase tracking-widest">
                        Wins
                      </span>
                    </div>
                  </div>
                );
              })}
              {counts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-white/30">
                  <Flame size={48} className="mb-4 opacity-50" />
                  <p className="font-mono text-sm uppercase tracking-widest">No games played yet</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}