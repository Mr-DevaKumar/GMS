import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { LogOut, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';

const STYLES = `
  @keyframes rise {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .animate-rise { animation: rise 0.5s cubic-bezier(0.2,0.8,0.2,1) both; }

  @keyframes shimmer {
    0%, 100% { opacity: 0.35; }
    50%      { opacity: 0.65; }
  }
  .animate-shimmer { animation: shimmer 1.8s ease-in-out infinite; }

  @media (prefers-reduced-motion: reduce) {
    .animate-rise, .animate-shimmer, .animate-ping { animation: none !important; }
  }
`;

/* ---------- Decorative glyph ---------- */

function GlyphMark({ size = 6, gap = 3 }: { size?: number; gap?: number }) {
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
          }}
        />
      ))}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/* ---------- Sub-components ---------- */

function SkeletonCard({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="bg-[var(--surface)] border border-[var(--line)] rounded-3xl p-4 sm:p-5 animate-rise"
      style={{ animationDelay: `${delay}ms` }}
      aria-hidden="true"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-[var(--surface-2)] animate-shimmer flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div
            className="h-4 rounded-full bg-[var(--surface-2)] animate-shimmer"
            style={{ width: '65%' }}
          />
          <div
            className="h-3 rounded-full bg-[var(--surface-2)] animate-shimmer"
            style={{ width: '35%', animationDelay: '200ms' }}
          />
        </div>
        <div className="w-9 h-9 rounded-full bg-[var(--surface-2)] animate-shimmer flex-shrink-0" />
      </div>
    </div>
  );
}

function GameCard({
  index,
  name,
  onClick,
  delay,
}: {
  index: number;
  name: string;
  onClick: () => void;
  delay: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        group w-full text-left bg-[var(--surface)] border border-[var(--line)] rounded-3xl
        p-4 sm:p-5
        hover:border-[var(--ink-3)]
        active:scale-[0.99] active:bg-[var(--surface-2)]
        transition-all duration-150 touch-manipulation
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]
        focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]
        animate-rise
      "
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-[var(--surface-2)] flex items-center justify-center flex-shrink-0">
          <span className="dot-num text-base text-[var(--ink-2)]">
            {String(index).padStart(2, '0')}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base sm:text-lg truncate">{name}</h3>
          <div className="label mt-1">Tap to open</div>
        </div>
        <div className="w-9 h-9 rounded-full bg-[var(--surface-2)] flex items-center justify-center flex-shrink-0 text-[var(--ink-3)] group-hover:bg-[var(--ink)] group-hover:text-[var(--bg)] transition-all duration-200">
          <ChevronRight size={16} />
        </div>
      </div>
    </button>
  );
}

function EmptyState() {
  return (
    <div className="bg-[var(--surface)] border border-[var(--line)] rounded-3xl py-16 px-6 text-center animate-rise">
      <div
        className="inline-flex items-center justify-center w-16 h-16 rounded-full border border-[var(--line)] mb-5"
        aria-hidden="true"
      >
        <div className="grid grid-cols-3" style={{ gap: 3 }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <span
              key={i}
              className="rounded-full"
              style={{
                width: 4,
                height: 4,
                background: i === 4 ? 'var(--accent)' : 'var(--ink-3)',
                opacity: i === 4 ? 1 : 0.5,
              }}
            />
          ))}
        </div>
      </div>
      <h3 className="font-bold text-lg mb-2">No games yet</h3>
      <p className="text-[var(--ink-3)] text-sm max-w-[16rem] mx-auto">
        Ask the admin to assign you to a game — it will appear here.
      </p>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-[var(--accent-soft)] border border-[var(--accent)]/20 rounded-2xl text-[var(--accent)] text-sm font-bold animate-rise">
      <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
      <span className="leading-snug">{message}</span>
    </div>
  );
}

/* ---------- Page ---------- */

export default function CoordinatorHome() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    async function load() {
      if (!profile) return;
      setLoading(true);
      setError('');

      try {
        const { data: assignments, error: assignErr } = await supabase
          .from('game_coordinators')
          .select('game_id')
          .eq('user_id', profile.id);

        if (assignErr) throw assignErr;

        if (!assignments || assignments.length === 0) {
          setGames([]);
          setLoading(false);
          return;
        }

        const ids = assignments.map((a) => a.game_id);
        const { data: gamesData, error: gamesErr } = await supabase
          .from('games')
          .select('id, name')
          .in('id', ids);

        if (gamesErr) throw gamesErr;

        setGames(gamesData || []);
      } catch (err: any) {
        console.error('Error loading games:', err);
        setError(err.message || 'Failed to load assigned games');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [profile]);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      await signOut();
      navigate('/login');
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <>
      <style>{STYLES}</style>

      <div className="min-h-[100dvh] bg-[var(--bg)] text-[var(--ink)] relative">
        {/* Fixed dot-grid canvas */}
        <div
          className="fixed inset-0 pointer-events-none opacity-70"
          style={{
            backgroundImage:
              'radial-gradient(circle, var(--line) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
          aria-hidden="true"
        />
        {/* Accent glow */}
        <div
          className="fixed -top-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-[0.06] pointer-events-none"
          style={{ background: 'var(--accent)' }}
          aria-hidden="true"
        />

        {/* Content column */}
        <div className="relative max-w-2xl mx-auto px-5 sm:px-6 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))]">
          {/* ---------- Top bar ---------- */}
          <header className="flex items-center justify-between mb-10 animate-rise">
            <div className="flex items-center gap-2.5">
              <GlyphMark size={6} gap={3} />
              <span
                className="font-bold tracking-[0.25em] text-[10px] uppercase"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Mission Sunday
              </span>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              aria-label="Sign out"
              className="
                w-10 h-10 rounded-full
                bg-[var(--surface)] border border-[var(--line)]
                flex items-center justify-center
                text-[var(--ink-3)]
                hover:text-[var(--accent)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]
                active:scale-90 transition-all duration-150
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]
                focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {signingOut ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <LogOut size={16} />
              )}
            </button>
          </header>

          {/* ---------- Greeting ---------- */}
          <section className="mb-10 animate-rise" style={{ animationDelay: '80ms' }}>
            <div className="label mb-2">{getGreeting()}</div>
            <h1 className="dot-num text-3xl sm:text-4xl leading-tight">
              {profile?.display_name || 'Coordinator'}
            </h1>
            <div className="flex items-center gap-2 mt-4">
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--green)] opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--green)]" />
              </span>
              <span className="label">Online · Coordinator</span>
            </div>
          </section>

          {/* ---------- Games ---------- */}
          <section className="animate-rise" style={{ animationDelay: '160ms' }}>
            <div className="flex items-center justify-between mb-4 px-1">
              <span className="label">My Games</span>
              <span className="label">
                {loading ? '—' : String(games.length).padStart(2, '0')}
              </span>
            </div>

            {loading ? (
              <div className="space-y-3">
                <SkeletonCard delay={0} />
                <SkeletonCard delay={80} />
                <SkeletonCard delay={160} />
              </div>
            ) : (
              <>
                {error && <ErrorBanner message={error} />}

                {!error && games.length === 0 && <EmptyState />}

                {games.length > 0 && (
                  <div className="space-y-3">
                    {games.map((g, i) => (
                      <GameCard
                        key={g.id}
                        index={i + 1}
                        name={g.name}
                        onClick={() => navigate(`/c/game/${g.id}`)}
                        delay={i * 60}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </>
  );
}