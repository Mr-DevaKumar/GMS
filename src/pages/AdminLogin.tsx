import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Loader2, Lock, Mail } from 'lucide-react';

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

  @media (prefers-reduced-motion: reduce) {
    .glyph-spin, .animate-rise, .animate-shake { animation: none !important; }
  }
`;

/* ---------- Fixed Decorative Glyph ---------- */
function GlyphMark({ size = 10, gap = 4 }: { size?: number; gap?: number }) {
  return (
    <div 
      className="inline-grid grid-cols-3 w-fit" 
      style={{ gap }} 
      aria-hidden="true"
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <span
          key={i}
          className="rounded-full"
          style={{
            width: size,
            height: size,
            background: i === 4 ? 'var(--accent)' : 'var(--ink)',
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

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const nav = useNavigate();
  const { refresh } = useAuth();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setError(error.message);
      setLoading(false);
      setShake(true);
      setTimeout(() => setShake(false), 400);
      if (navigator.vibrate) navigator.vibrate([30, 40, 30]);
    } else {
      await refresh();
      nav('/admin');
    }
  }

  return (
    <>
      <style>{STYLES}</style>

      <div className="min-h-[100dvh] w-full grid lg:grid-cols-2 bg-[var(--surface-2)] text-[var(--ink)]">
        
        {/* ============ LEFT / BRAND PANEL (Desktop Only) ============ */}
        <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 xl:p-16 bg-[var(--surface)] border-r border-[var(--line)]">
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
            <span className="font-bold tracking-[0.25em] text-xs uppercase" style={{ fontFamily: 'var(--font-mono)' }}>
              Mission Sunday
            </span>
          </div>

          <div className="relative flex items-center justify-center py-10">
            <GlyphRing />
          </div>

          <div className="relative">
            <div className="label mb-3">Admin Access</div>
            <h2 className="dot-num text-4xl xl:text-5xl leading-[1.05]">
              Manage the event.
              <br />
              Keep it perfect.
            </h2>
            <p className="mt-5 text-[11px] uppercase tracking-[0.2em] text-[var(--ink-3)]" style={{ fontFamily: 'var(--font-mono)' }}>
              Secure · Private · Yours
            </p>
          </div>
        </aside>

        {/* ============ RIGHT / MOBILE & FORM ============ */}
        <main className="relative flex flex-col p-5 sm:p-8 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] items-center justify-center">
          
          {/* Mobile Background Texture */}
          <div
            className="lg:hidden absolute inset-0 pointer-events-none opacity-40"
            style={{
              backgroundImage: 'radial-gradient(circle, var(--line) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />

          <div className={`relative w-full max-w-sm ${shake ? 'animate-shake' : ''}`}>
            
            {/* Back Button */}
            <button 
              onClick={() => nav('/login')} 
              className="mb-10 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors animate-rise"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              <ArrowLeft size={14} /> Back to Coordinator
            </button>

            {/* Brand / Title Area */}
            <div className="mb-8 animate-rise" style={{ animationDelay: '60ms' }}>
              {/* Mobile-only glyph */}
              <div className="lg:hidden mb-5">
                <GlyphMark size={8} gap={4} />
              </div>
              
              <h1 className="font-bold text-3xl tracking-tight mb-2">Admin Access</h1>
              <p className="text-sm text-[var(--ink-2)]">Enter your credentials to manage the event.</p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="flex flex-col gap-4 animate-rise" style={{ animationDelay: '120ms' }}>
              
              <div>
                <label className="label block mb-2 ml-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-3)] pointer-events-none" size={18} />
                  <input
                    type="email"
                    className="input !pl-12"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="label block mb-2 ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-3)] pointer-events-none" size={18} />
                  <input
                    type="password"
                    className="input !pl-12"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Error Slot (Fixed height to prevent layout shift) */}
              <div className="min-h-[32px] flex items-center mt-1 ml-1">
                {error && (
                  <div 
                    role="alert" 
                    className="text-[11px] font-bold text-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1.5 rounded-full animate-rise"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {error}
                  </div>
                )}
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                className="
                  w-full h-14 rounded-2xl mt-2
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
                    Signing in…
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>
            
          </div>
        </main>
      </div>
    </>
  );
}