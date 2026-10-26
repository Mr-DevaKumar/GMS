import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Play, Pause, RotateCcw, Settings, Check } from 'lucide-react';
import { BottomSheet } from './ui/Shared';

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
  const [duration, setDuration] = useState(durationSeconds);
  const [remainingPaused, setRemainingPaused] = useState(durationSeconds);
  const [displayTime, setDisplayTime] = useState(durationSeconds);
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editMins, setEditMins] = useState('0');
  const [editSecs, setEditSecs] = useState('30');
  const [isSaving, setIsSaving] = useState(false);

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
      setDuration(data.duration_seconds);
      setRemainingPaused(data.remaining_seconds ?? data.duration_seconds);
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
        const rem = Math.max(0, duration - elapsed);
        
        setDisplayTime(rem);

        if (rem <= 0) {
          clearInterval(interval);
          setState('finished');
        }
      }, 100); 
      
    } else if (state === 'paused') {
      setDisplayTime(remainingPaused);
    } else if (state === 'idle') {
      setDisplayTime(duration);
      setStartedAt(null);
      stopAlarm();
    } else if (state === 'finished') {
      setDisplayTime(0);
    }

    return () => clearInterval(interval);
  }, [state, startedAt, duration, remainingPaused]);

  // Alarm Logic
  useEffect(() => {
    if (displayTime === 0 && state === 'finished') {
      startAlarm();
    } else {
      stopAlarm();
    }
  }, [displayTime, state]);

  function playPing(ctx: AudioContext, startTime: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine'; 
    osc.frequency.setValueAtTime(1200, startTime);
    osc.frequency.exponentialRampToValueAtTime(600, startTime + 0.2);
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
      if ('vibrate' in navigator) navigator.vibrate([300, 150, 300, 150, 300]);
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      playPing(ctx, now);
      playPing(ctx, now + 0.3);
      playPing(ctx, now + 0.6);
    } catch (e) { console.warn('Alarm failed', e); }
  }

  function startAlarm() {
    if (alarmIntervalRef.current) return;
    playAlarmSequence();
    alarmIntervalRef.current = window.setInterval(playAlarmSequence, 2500);
  }

  function stopAlarm() {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    if ('vibrate' in navigator) navigator.vibrate(0); 
  }

  async function action(act: 'start'|'pause'|'reset') {
    stopAlarm();
    if (act === 'start') {
      setState('running');
      setStartedAt(new Date(Date.now() + offsetRef.current).toISOString());
    } else if (act === 'pause') {
      const nowServer = Date.now() + offsetRef.current;
      const elapsed = startedAt ? (nowServer - new Date(startedAt).getTime()) / 1000 : 0;
      const rem = Math.max(0, duration - elapsed);
      setRemainingPaused(rem);
      setDisplayTime(rem);
      setState('paused');
      setStartedAt(null);
    } else if (act === 'reset') {
      setState('idle');
      setStartedAt(null);
      setDisplayTime(duration);
    }
    try {
      await supabase.rpc('timer_action', { p_game_id: gameId, p_action: act });
    } catch (err) { console.error("Timer sync failed", err); loadState(); }
  }

  function openEdit() {
    const m = Math.floor(duration / 60);
    const s = duration % 60;
    setEditMins(String(m));
    setEditSecs(String(s));
    setIsEditing(true);
  }

  function setPreset(totalSecs: number) {
    setEditMins(String(Math.floor(totalSecs / 60)));
    setEditSecs(String(totalSecs % 60));
  }

  async function saveEdit() {
    const mins = parseInt(editMins || '0');
    const secs = parseInt(editSecs || '0');
    const totalSeconds = (mins * 60) + secs;
    
    if (totalSeconds <= 0) return;
    
    setIsSaving(true);
    try {
      await supabase.rpc('update_timer_duration', { p_game_id: gameId, p_seconds: totalSeconds });
      setIsEditing(false);
    } catch (err: any) {
      alert("Failed to update timer: " + err.message);
    } finally {
      setIsSaving(false);
    }
  }

  const m = Math.floor(displayTime / 60);
  const s = Math.floor(displayTime % 60);
  const isAlarm = displayTime === 0 && state !== 'idle';

  return (
    <div className="card bg-[var(--surface)] border border-[var(--line)] flex flex-col items-center py-6 px-4 mb-6 relative">
      <style>{STYLES}</style>
      
      {/* Header with Prominent Edit Button */}
      <div className="w-full flex justify-between items-center mb-4 px-2">
        <div className="label">Game Timer</div>
        <button 
          onClick={openEdit} 
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface-2)] rounded-full text-[10px] font-bold text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <Settings size={12} /> EDIT
        </button>
      </div>
      
      {/* Time Display */}
      <div 
        className={`
          font-display text-[80px] leading-none font-bold tracking-widest mb-6 transition-colors duration-300
          ${isAlarm ? 'text-[var(--accent)] animate-alarm-bounce' : 'text-[var(--ink)]'}
        `}
      >
        {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
      </div>
      
      {/* Controls */}
      <div className="flex gap-4">
        {state !== 'running' ? (
          <button onClick={() => action('start')} className="w-16 h-16 rounded-full bg-[var(--green)] text-white flex items-center justify-center shadow-lg active:scale-95 transition">
            <Play size={28} className="ml-1" />
          </button>
        ) : (
          <button onClick={() => action('pause')} className="w-16 h-16 rounded-full bg-[var(--amber)] text-white flex items-center justify-center shadow-lg active:scale-95 transition">
            <Pause size={28} />
          </button>
        )}
        <button onClick={() => action('reset')} className="w-16 h-16 rounded-full bg-[var(--surface-2)] text-[var(--ink-2)] flex items-center justify-center active:scale-95 transition border border-[var(--line)]">
          <RotateCcw size={26} />
        </button>
      </div>

      {/* ================= EDIT TIMER SHEET ================= */}
      <BottomSheet open={isEditing} onClose={() => setIsEditing(false)} title="Change Timer">
        <div className="flex flex-col gap-6 py-2">
          <p className="text-sm text-[var(--ink-3)] leading-relaxed">
            Changing the timer will reset the current countdown. You must press Start again to begin.
          </p>

          {/* Custom Time Picker */}
          <div className="flex items-center justify-center gap-4">
            <div className="flex flex-col items-center">
              <input
                type="text"
                inputMode="numeric"
                className="w-28 h-24 bg-[var(--surface-2)] rounded-3xl text-center text-5xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[var(--ink)] transition-shadow"
                value={editMins}
                onChange={(e) => setEditMins(e.target.value.replace(/\D/g, '').slice(0, 2))}
              />
              <span className="text-xs font-mono font-bold uppercase text-[var(--ink-3)] mt-3 tracking-widest">Min</span>
            </div>
            
            <span className="text-4xl font-bold mb-8">:</span>
            
            <div className="flex flex-col items-center">
              <input
                type="text"
                inputMode="numeric"
                className="w-28 h-24 bg-[var(--surface-2)] rounded-3xl text-center text-5xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[var(--ink)] transition-shadow"
                value={editSecs}
                onChange={(e) => {
                  let val = e.target.value.replace(/\D/g, '');
                  if (parseInt(val) > 59) val = '59';
                  setEditSecs(val.slice(0, 2));
                }}
              />
              <span className="text-xs font-mono font-bold uppercase text-[var(--ink-3)] mt-3 tracking-widest">Sec</span>
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <div className="label mb-3 text-center">Quick Presets</div>
            <div className="flex flex-wrap justify-center gap-2">
              {[30, 60, 90, 120, 300, 600].map(sec => (
                <button
                  key={sec}
                  onClick={() => setPreset(sec)}
                  className="px-4 py-2 rounded-full bg-[var(--surface-2)] text-sm font-bold text-[var(--ink-2)] hover:bg-[var(--line)] transition-colors"
                >
                  {sec >= 60 ? `${sec / 60} min` : `${sec} sec`}
                </button>
              ))}
            </div>
          </div>

          <button 
            className="btn w-full h-14 mt-2 text-lg" 
            onClick={saveEdit} 
            disabled={isSaving || (parseInt(editMins || '0') === 0 && parseInt(editSecs || '0') === 0)}
          >
            {isSaving ? 'Saving…' : <><Check size={20} /> Save New Time</>}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
