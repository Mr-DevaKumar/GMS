import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Play, Pause, RotateCcw } from 'lucide-react';

const STYLES = `
  @keyframes alarm-bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-15px) scale(1.05); }
  }
  .animate-alarm-bounce {
    animation: alarm-bounce 0.4s ease-in-out infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    .animate-alarm-bounce { animation: none !important; }
  }
`;

export default function Timer({ gameId, durationSeconds }: { gameId: string; durationSeconds: number }) {
  const [state, setState] = useState<'idle'|'running'|'paused'|'finished'>('idle');
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [remainingPaused, setRemainingPaused] = useState(durationSeconds);
  const [displayTime, setDisplayTime] = useState(durationSeconds);
  
  const offsetRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    // 1. Get accurate server time offset
    supabase.rpc('get_server_time').then(({ data }) => {
      if (data) offsetRef.current = new Date(data).getTime() - Date.now();
    });

    // 2. Load initial state from DB
    loadState();

    // 3. Listen for changes from other devices
    const ch = supabase.channel(`timer-${gameId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'timer_state', filter: `game_id=eq.${gameId}` }, loadState)
      .subscribe();

    return () => { 
      supabase.removeChannel(ch);
      stopAlarm();
    };
  }, [gameId]);

  async function loadState() {
    const { data } = await supabase.from('timer_state').select('*').eq('game_id', gameId).maybeSingle();
    if (data) {
      setState(data.state);
      setStartedAt(data.started_at);
      setRemainingPaused(data.remaining_seconds ?? durationSeconds);
    } else {
      await supabase.from('timer_state').insert({ game_id: gameId, duration_seconds: durationSeconds, state: 'idle' });
    }
  }

  // Local ticking logic
  useEffect(() => {
    let interval: any;
    
    if (state === 'running') {
      const actualStart = startedAt || new Date(Date.now() + offsetRef.current).toISOString();
      if (!startedAt) setStartedAt(actualStart);

      interval = setInterval(() => {
        const nowServer = Date.now() + offsetRef.current;
        const elapsed = (nowServer - new Date(actualStart).getTime()) / 1000;
        const rem = Math.max(0, durationSeconds - elapsed);
        
        setDisplayTime(rem);

        if (rem <= 0) {
          clearInterval(interval);
          setState('finished');
        }
      }, 100); 
      
    } else if (state === 'paused') {
      setDisplayTime(remainingPaused);
    } else if (state === 'idle') {
      setDisplayTime(durationSeconds);
      setStartedAt(null);
      stopAlarm();
    } else if (state === 'finished') {
      setDisplayTime(0);
    }

    return () => clearInterval(interval);
  }, [state, startedAt, durationSeconds, remainingPaused]);

  // Alarm Logic
  useEffect(() => {
    if (displayTime === 0 && state === 'finished') {
      startAlarm();
    } else {
      stopAlarm();
    }
  }, [displayTime, state]);

  // Helper to play a single futuristic "Ping"
  function playPing(ctx: AudioContext, startTime: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine'; 
    
    // Pitch drops rapidly from 1200Hz to 600Hz (Sonar effect)
    osc.frequency.setValueAtTime(1200, startTime);
    osc.frequency.exponentialRampToValueAtTime(600, startTime + 0.2);

    // Sharp attack, smooth fade out
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02); 
    gain.gain.exponentialRampToValueAtTime(0.00001, startTime + 0.8); 

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + 1.0);
  }

  function playAlarmSequence() {
    try {
      // 1. Trigger Vibration (Android)
      if ('vibrate' in navigator) {
        // Pattern: Vibrate 300ms, pause 150ms, repeat 3 times
        navigator.vibrate([300, 150, 300, 150, 300]);
      }

      // 2. Trigger Audio
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      
      // Play a rapid sequence of 3 pings
      playPing(ctx, now);
      playPing(ctx, now + 0.3);
      playPing(ctx, now + 0.6);
      
    } catch (e) {
      console.warn('Alarm playback failed', e);
    }
  }

  function startAlarm() {
    if (alarmIntervalRef.current) return;
    playAlarmSequence();
    // Repeat the 3-ping + vibration sequence every 2.5 seconds
    alarmIntervalRef.current = window.setInterval(playAlarmSequence, 2500);
  }

  function stopAlarm() {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    // Cancel any ongoing vibration
    if ('vibrate' in navigator) {
      navigator.vibrate(0); 
    }
  }

  async function action(act: 'start'|'pause'|'reset') {
    stopAlarm();
    
    if (act === 'start') {
      setState('running');
      setStartedAt(new Date(Date.now() + offsetRef.current).toISOString());
    } else if (act === 'pause') {
      const nowServer = Date.now() + offsetRef.current;
      const elapsed = startedAt ? (nowServer - new Date(startedAt).getTime()) / 1000 : 0;
      const rem = Math.max(0, durationSeconds - elapsed);
      setRemainingPaused(rem);
      setDisplayTime(rem);
      setState('paused');
      setStartedAt(null);
    } else if (act === 'reset') {
      setState('idle');
      setStartedAt(null);
      setDisplayTime(durationSeconds);
    }

    try {
      await supabase.rpc('timer_action', { p_game_id: gameId, p_action: act });
    } catch (err) {
      console.error("Timer sync failed", err);
      loadState();
    }
  }

  const m = Math.floor(displayTime / 60);
  const s = Math.floor(displayTime % 60);
  const isAlarm = displayTime === 0 && state !== 'idle';

  return (
    <div className="card bg-[var(--surface)] border border-[var(--line)] flex flex-col items-center py-6 mb-6 overflow-hidden">
      <style>{STYLES}</style>
      
      <div className="label mb-2">Game Timer</div>
      
      <div 
        className={`
          font-display text-6xl font-bold tracking-widest mb-6 transition-colors duration-300
          ${isAlarm ? 'text-[var(--accent)] animate-alarm-bounce' : 'text-[var(--ink)]'}
        `}
      >
        {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
      </div>
      
      <div className="flex gap-4">
        {state !== 'running' ? (
          <button 
            onClick={() => action('start')} 
            className="w-14 h-14 rounded-full bg-[var(--green)] text-white flex items-center justify-center shadow-lg active:scale-95 transition"
          >
            <Play size={24} className="ml-1" />
          </button>
        ) : (
          <button 
            onClick={() => action('pause')} 
            className="w-14 h-14 rounded-full bg-[var(--amber)] text-white flex items-center justify-center shadow-lg active:scale-95 transition"
          >
            <Pause size={24} />
          </button>
        )}
        
        <button 
          onClick={() => action('reset')} 
          className="w-14 h-14 rounded-full bg-[var(--surface-2)] text-[var(--ink-2)] flex items-center justify-center active:scale-95 transition"
        >
          <RotateCcw size={24} />
        </button>
      </div>
    </div>
  );
}
