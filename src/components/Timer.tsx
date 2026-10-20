import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useToast } from './Toast';

export default function Timer({ gameId, durationSeconds }: { gameId: string; durationSeconds: number }) {
  const [state, setState] = useState<'idle' | 'running' | 'paused' | 'finished'>('idle');
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [remainingPaused, setRemainingPaused] = useState(durationSeconds);
  const [displayTime, setDisplayTime] = useState(durationSeconds);
  const [progress, setProgress] = useState(0); // 0 to 1
  
  const offsetRef = useRef(0);
  const { show } = useToast();

  const totalDuration = durationSeconds || 60; // fallback safety

  useEffect(() => {
    // 1. Get server time offset
    supabase.rpc('get_server_time').then(({ data }) => {
      if (data) offsetRef.current = new Date(data).getTime() - Date.now();
    });

    // 2. Load initial timer state
    loadState();

    // 3. Subscribe to realtime updates
    const ch = supabase.channel(`timer-${gameId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'timer_state', filter: `game_id=eq.${gameId}` }, loadState)
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [gameId]);

  async function loadState() {
    const { data } = await supabase.from('timer_state').select('*').eq('game_id', gameId).maybeSingle();
    if (data) {
      setState(data.state);
      setStartedAt(data.started_at);
      setRemainingPaused(data.remaining_seconds ?? totalDuration);
    } else {
      await supabase.from('timer_state').insert({ game_id: gameId, duration_seconds: totalDuration, state: 'idle' });
    }
  }

  // Ultra-smooth 60fps ticking logic using requestAnimationFrame
  useEffect(() => {
    let rafId: number;
    let lastSecond = -1;

    const tick = () => {
      if (state !== 'running' || !startedAt) return;

      const nowServer = Date.now() + offsetRef.current;
      const elapsed = (nowServer - new Date(startedAt).getTime()) / 1000;
      const rem = Math.max(0, totalDuration - elapsed);
      
      // Smooth progress 0 -> 1
      setProgress(Math.min(1, Math.max(0, 1 - (rem / totalDuration))));

      // Only update the text (seconds) when the integer changes to prevent text jitter
      const currentSecond = Math.ceil(rem);
      if (currentSecond !== lastSecond) {
        setDisplayTime(rem);
        lastSecond = currentSecond;
      }

      if (rem <= 0) {
        setState('finished');
        show('Time is up!', true);
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    if (state === 'running') {
      rafId = requestAnimationFrame(tick);
    } else if (state === 'paused') {
      setDisplayTime(remainingPaused);
      setProgress(Math.min(1, Math.max(0, 1 - (remainingPaused / totalDuration))));
    } else if (state === 'idle') {
      setDisplayTime(totalDuration);
      setProgress(0);
    } else if (state === 'finished') {
      setDisplayTime(0);
      setProgress(1);
    }

    return () => cancelAnimationFrame(rafId);
  }, [state, startedAt, totalDuration, remainingPaused]);

  async function action(act: 'start' | 'pause' | 'reset') {
    // Optimistic UI updates for instant feedback
    if (act === 'start') {
      setState('running');
      setStartedAt(new Date().toISOString());
    }
    if (act === 'pause') {
      setState('paused');
      setRemainingPaused(displayTime);
    }
    if (act === 'reset') {
      setState('idle');
      setDisplayTime(totalDuration);
      setProgress(0);
    }
    
    // Sync with DB
    await supabase.rpc('timer_action', { p_game_id: gameId, p_action: act });
  }

  const m = Math.floor(displayTime / 60);
  const s = Math.floor(displayTime % 60);
  const timeString = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  
  // SVG circle math
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress * circumference);

  // Visual states
  const isLowTime = displayTime <= 10 && state !== 'idle';
  const statusColor = 
    state === 'running' ? 'text-[var(--green)] bg-[var(--green)]/10 border-[var(--green)]/20' :
    state === 'paused' ? 'text-[var(--amber)] bg-[var(--amber)]/10 border-[var(--amber)]/20' :
    state === 'finished' ? 'text-[var(--accent)] bg-[var(--accent)]/10 border-[var(--accent)]/20' :
    'text-[var(--ink-3)] bg-[var(--surface-2)] border-[var(--line)]';

  return (
    <div className="relative overflow-hidden bg-[var(--surface)] border border-[var(--line)] rounded-[2rem] p-6 flex flex-col items-center shadow-sm">
      
      {/* Background Dot Texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--line) 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      />

      {/* Header */}
      <div className="relative w-full flex items-center justify-between mb-4">
        <span className="label">Game Timer</span>
        <span className={`text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full border ${statusColor}`}>
          {state}
        </span>
      </div>

      {/* Circular Timer Ring */}
      <div className="relative w-48 h-48 flex items-center justify-center mb-4">
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
          {/* Track */}
          <circle
            cx="60" cy="60" r={radius}
            fill="none"
            stroke="var(--surface-2)"
            strokeWidth="6"
          />
          {/* Progress */}
          <circle
            cx="60" cy="60" r={radius}
            fill="none"
            stroke={isLowTime ? 'var(--accent)' : 'var(--ink)'}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-colors duration-300"
            style={{ willChange: 'stroke-dashoffset' }}
          />
        </svg>
        
        {/* Center Text */}
        <div className="relative flex flex-col items-center">
          <div className="dot-num text-5xl tabular-nums tracking-widest text-[var(--ink)]">
            {timeString}
          </div>
          <div className="label mt-1 text-[9px] text-[var(--ink-3)]">
            Remaining
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="relative flex items-center gap-6 mt-1">
        <button 
          onClick={() => action('reset')} 
          className="w-12 h-12 rounded-full flex items-center justify-center text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)] transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          aria-label="Reset timer"
        >
          <RotateCcw size={20} />
        </button>
        
        {state !== 'running' ? (
          <button 
            onClick={() => action('start')} 
            className="w-16 h-16 rounded-full bg-[var(--ink)] text-[var(--bg)] flex items-center justify-center shadow-lg hover:shadow-xl active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            aria-label="Start timer"
          >
            <Play size={26} className="ml-1" />
          </button>
        ) : (
          <button 
            onClick={() => action('pause')} 
            className="w-16 h-16 rounded-full bg-[var(--surface-2)] border-2 border-[var(--ink)] text-[var(--ink)] flex items-center justify-center active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            aria-label="Pause timer"
          >
            <Pause size={26} />
          </button>
        )}

        {/* Spacer to keep Play button perfectly centered */}
        <div className="w-12 h-12" />
      </div>
    </div>
  );
}