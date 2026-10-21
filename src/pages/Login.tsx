import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Delete, Loader2, ArrowRight, Lock, Eye, EyeOff } from 'lucide-react';

const PIN_MAX = 10;

const STYLES = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-6px); }
    40% { transform: translateX(6px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }
  .animate-shake { animation: shake 0.4s ease-in-out; }

  @keyframes rise {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .animate-rise { animation: rise 0.5s cubic-bezier(0.2,0.8,0.2,1) both; }

  @keyframes glyphSpin { to { transform: rotate(360deg); } }
  .glyph-spin { animation: glyphSpin 60s linear infinite; }

  /* Loader Animations */
  @keyframes pulse-dot {
    0%, 100% { opacity: 0.15; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1); }
  }
  
  @keyframes load-progress {
    0% { width: 0%; }
    20% { width: 15%; }
    50% { width: 45%; }
    80% { width: 85%; }
    100% { width: 100%; }
  }

  @media (prefers-reduced-motion: reduce) {
    .glyph-spin, .animate-rise, .animate-shake { animation: none !important; }
  }
`;

/* ---------- Nothing-style decorative glyphs ---------- */

function GlyphMark({ size = 10, gap = 4, animated = false }: { size?: number; gap?: number; animated?: boolean }) {
  return (
    <div className="grid grid-cols-3" style={{ gap }} aria-hidden="true">
      {Array.from({ length: 9 }).map((_, i) => (
        <span
          key={i}
          className="rounded-full"
          style={{
            width: size,
            height: size,
            background: i === 4 ? 'var(--accent)' : 'var(--ink)',
            animation: animated ? `pulse-dot 1.5s ease-in-out infinite ${i * 0.1}s` : 'none',
          }}
        />
      ))}
    </div>
  );
}

function GlyphRing() {
  const COUNT = 36;
  const R = 44;
  return (
    <div className="relative w-56 h-56 xl:w-72 xl:h-72" aria-hidden="true">
      <div className="glyph-spin absolute inset-0">
        {Array.from({ length: COUNT }).map((_, i) => {
          const angle = (i / COUNT) * Math.PI * 2;
          const x = 50 + Math.cos(angle) * R;
          const y = 50 + Math.sin(angle) * R;
          const isAccent = i % 9 === 0;
          const isBright = i % 3 === 0;
          return (
            <span
              key={i}
              className="absolute rounded-full"
              style={{
                width: isAccent ? 6 : 4,
                height: isAccent ? 6 : 4,
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
                background: isAccent ? 'var(--accent)' : isBright ? 'var(--ink)' : 'var(--line)',
                opacity: isBright ? 1 : 0.55,
              }}
            />
          );
        })}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <GlyphMark size={12} gap={5} />
      </div>
    </div>
  );
}

/* ---------- Keypad button ---------- */

function KeyButton({
  children,
  onClick,
  disabled,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="
        h-14 rounded-full select-none touch-manipulation
        flex items-center justify-center
        bg-[var(--surface)] border border-[var(--line)]
        shadow-[0_1px_0_rgba(0,0,0,0.03)]
        active:scale-95 active:bg-[var(--surface-2)]
        transition-all duration-150
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2
        disabled:opacity-40 disabled:cursor-not-allowed
      "
    >
      {children}
    </button>
  );
}

/* ---------- Page ---------- */

export default function Login() {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(true); // PIN visible by default
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  
  const { profile } = useAuth();
  const nav = useNavigate();

  // Simulate initial system boot
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 1500); 
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (profile) nav(profile.role === 'admin' ? '/admin' : '/c');
  }, [profile, nav]);

  const submitPin = useCallback(async () => {
    if (!pin || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/login-coordinator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
      nav('/c');
    } catch (e) {
      setError('Invalid PIN. Please try again.');
      setPin('');
      setShake(true);
      setTimeout(() => setShake(false), 400);
      if (navigator.vibrate) navigator.vibrate([30, 40, 30]);
    } finally {
      setLoading(false);
    }
  }, [pin, loading, nav]);

  const addDigit = useCallback(
    (digit: string) => {
      if (loading) return;
      setPin((p) => (p.length < PIN_MAX ? p + digit : p));
    },
    [loading]
  );

  const backspace = useCallback(() => {
    if (loading) return;
    setPin((p) => p.slice(0, -1));
  }, [loading]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        addDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        backspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        submitPin();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [addDigit, backspace, submitPin]);

  /* ---------- INITIAL LOADER SCREEN ---------- */
  if (isInitializing) {
    return (
      <>
        <style>{STYLES}</style>
        <div className="fixed inset-0 bg-[var(--bg)] flex flex-col items-center justify-center z-50 overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              backgroundImage: 'radial-gradient(circle, var(--line) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          <div className="relative z-10 flex flex-col items-center">
            <div className="flex items-center justify-center w-32 h-32 mb-10 bg-[var(--surface)] rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-[var(--line)]">
              <GlyphMark size={12} gap={8} animated />
            </div>
            <div className="flex flex-col items-center gap-5 w-64">
              <span 
                className="text-xs font-bold tracking-[0.4em] font-mono text-[var(--ink)] uppercase ml-2"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Initializing
              </span>
              <div className="w-full h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden shadow-inner">
                <div 
                  className="h-full bg-[var(--ink)] rounded-full"
                  style={{ animation: 'load-progress 1.5s cubic-bezier(0.4, 0, 0.2, 1) forwards' }} 
                />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  /* ---------- MAIN LOGIN UI ---------- */
  return (
    <>
      <style>{STYLES}</style>

      {/* Desktop */}
      <div className="hidden lg:grid lg:grid-cols-2 min-h-[100dvh] bg-[var(--surface-2)] text-[var(--ink)] animate-rise">
        {/* LEFT / BRAND */}
        <aside className="relative flex flex-col justify-between overflow-hidden p-12 xl:p-16 bg-[var(--surface)] border-r border-[var(--line)]">
          <div
            className="absolute inset-0 pointer-events-none opacity-70"
            style={{
              backgroundImage: 'radial-gradient(circle, var(--line) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }}
          />
          <div
            className="absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full blur-3xl opacity-10"
            style={{ background: 'var(--accent)' }}
          />

          <div className="relative flex items-center gap-3">
            <GlyphMark size={7} gap={3} />
            <span
              className="font-bold tracking-[0.25em] text-xs uppercase"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Mission Sunday
            </span>
          </div>

          <div className="relative flex items-center justify-center py-10">
            <GlyphRing />
          </div>

          <div className="relative">
            <div className="label mb-3">Coordinator Access</div>
            <h2 className="dot-num text-4xl xl:text-5xl leading-[1.05]">
              Run the room.
              <br />
              Keep the score.
            </h2>
            <p
              className="mt-5 text-[11px] uppercase tracking-[0.2em] text-[var(--ink-3)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Tap · Type · Go
            </p>
          </div>
        </aside>

        {/* RIGHT / PIN ENTRY */}
        <main className="flex flex-col items-center justify-center p-8">
          <div
            className={`w-full max-w-sm flex flex-col items-center ${
              shake ? 'animate-shake' : ''
            }`}
          >
            {/* New Interactive Input Field */}
            <div className="w-full mb-6">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="label">Enter PIN</span>
                <span className="label">
                  {pin.length}/{PIN_MAX}
                </span>
              </div>
              
              <div className="relative">
                <input
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, PIN_MAX);
                    setPin(val);
                  }}
                  placeholder="Enter your PIN"
                  maxLength={PIN_MAX}
                  disabled={loading}
                  className="
                    w-full h-16 bg-[var(--surface)] border border-[var(--line)] rounded-2xl 
                    px-4 pr-12 text-center font-mono text-2xl tracking-[0.2em] text-[var(--ink)] 
                    shadow-sm focus:outline-none focus:border-[var(--ink)] transition-colors 
                    placeholder:text-sm placeholder:font-sans placeholder:tracking-normal
                  "
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors"
                >
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="h-7 w-full flex items-center justify-center mb-2">
              {error && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="text-[var(--accent)] text-sm font-bold bg-[var(--accent-soft)] px-4 py-1 rounded-full"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {error}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4 w-full max-w-[320px] mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <KeyButton
                  key={n}
                  onClick={() => addDigit(String(n))}
                  disabled={loading}
                >
                  <span className="dot-num text-3xl">{n}</span>
                </KeyButton>
              ))}
              <div aria-hidden="true" />
              <KeyButton onClick={() => addDigit('0')} disabled={loading}>
                <span className="dot-num text-3xl">0</span>
              </KeyButton>
              <KeyButton
                onClick={backspace}
                disabled={loading || pin.length === 0}
                ariaLabel="Delete last digit"
              >
                <Delete size={22} />
              </KeyButton>
            </div>

            <button
              type="button"
              onClick={submitPin}
              disabled={pin.length === 0 || loading}
              className="
                w-full max-w-[320px] mt-6 h-14 rounded-2xl
                inline-flex items-center justify-center gap-2
                bg-[var(--ink)] text-[var(--bg)]
                text-sm font-bold uppercase tracking-[0.08em]
                transition-all active:scale-[0.98]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2
                disabled:opacity-40 disabled:cursor-not-allowed
                touch-manipulation
              "
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Signing in
                </>
              ) : (
                <>
                  Sign in <ArrowRight size={18} />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => nav('/login/admin')}
              className="mt-5 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.15em] text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              <Lock size={13} /> Admin sign-in
            </button>
          </div>
        </main>
      </div>

      {/* Mobile */}
      <div
        className="lg:hidden min-h-[100dvh] flex flex-col bg-[var(--surface-2)] text-[var(--ink)] animate-rise"
        style={{ overscrollBehavior: 'none' }}
      >
        <div className="relative flex-1 flex flex-col items-center justify-center gap-8 px-6 pt-[calc(1rem+env(safe-area-inset-top))] pb-6 overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none opacity-60"
            style={{
              backgroundImage: 'radial-gradient(circle, var(--line) 1px, transparent 1px)',
              backgroundSize: '18px 18px',
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 0%, var(--surface-2) 80%)',
            }}
          />
          <div
            className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl opacity-[0.08] pointer-events-none"
            style={{ background: 'var(--accent)' }}
          />

          <div className="relative flex flex-col items-center gap-2">
            <GlyphMark size={7} gap={3} />
            <h1 className="dot-num text-2xl tracking-[0.2em] mt-1">Mission Sunday</h1>
            <div className="label mt-0.5">Coordinator Access</div>
          </div>

          <div className={`relative flex flex-col items-center gap-3 w-full ${shake ? 'animate-shake' : ''}`}>
            {/* Mobile Interactive Input Field */}
            <div className="relative w-full max-w-[300px]">
              <input
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                value={pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, PIN_MAX);
                  setPin(val);
                }}
                placeholder="Enter your PIN"
                maxLength={PIN_MAX}
                disabled={loading}
                className="
                  w-full h-14 bg-[var(--surface)] border border-[var(--line)] rounded-2xl 
                  px-4 pr-12 text-center font-mono text-xl tracking-[0.2em] text-[var(--ink)] 
                  shadow-sm focus:outline-none focus:border-[var(--ink)] transition-colors 
                  placeholder:text-sm placeholder:font-sans placeholder:tracking-normal
                "
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors"
              >
                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="h-6 flex items-center justify-center">
              {error ? (
                <span
                  role="alert"
                  aria-live="polite"
                  className="text-[11px] font-bold text-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1 rounded-full"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {error}
                </span>
              ) : (
                <span
                  className="text-[10px] uppercase tracking-[0.2em] text-[var(--ink-3)]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {pin.length === 0 ? '' : `${pin.length} / ${PIN_MAX}`}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="relative flex-shrink-0 bg-[var(--surface)] rounded-t-[2.25rem] border-t border-[var(--line)] shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.10)] px-6 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="w-10 h-1 rounded-full bg-[var(--line)] mx-auto mb-4" aria-hidden="true" />

          <div className="grid grid-cols-3 gap-3 max-w-[300px] mx-auto">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <KeyButton
                key={n}
                onClick={() => addDigit(String(n))}
                disabled={loading}
              >
                <span className="dot-num text-2xl">{n}</span>
              </KeyButton>
            ))}
            <div aria-hidden="true" />
            <KeyButton onClick={() => addDigit('0')} disabled={loading}>
              <span className="dot-num text-2xl">0</span>
            </KeyButton>
            <KeyButton
              onClick={backspace}
              disabled={loading || pin.length === 0}
              ariaLabel="Delete last digit"
            >
              <Delete size={20} />
            </KeyButton>
          </div>

          <div className="max-w-[300px] mx-auto w-full mt-5 space-y-3">
            <button
              type="button"
              onClick={submitPin}
              disabled={pin.length === 0 || loading}
              className="
                w-full h-14 rounded-2xl
                inline-flex items-center justify-center gap-2
                bg-[var(--ink)] text-[var(--bg)]
                text-sm font-bold uppercase tracking-[0.1em]
                transition-all active:scale-[0.98]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2
                disabled:opacity-40 disabled:cursor-not-allowed
                touch-manipulation
              "
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Signing in
                </>
              ) : (
                <>
                  Sign in <ArrowRight size={18} />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => nav('/login/admin')}
              className="w-full inline-flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors py-1"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              <Lock size={11} /> Admin sign-in
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
