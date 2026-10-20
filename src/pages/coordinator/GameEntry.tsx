import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { dbPromise } from '../../lib/cache';
import { flushQueue } from '../../lib/sync';
import { BottomSheet, StatusPill } from '../../components/ui/Shared';
import { ArrowLeft, Plus, Search, Check, X } from 'lucide-react';
import Timer from '../../components/Timer';

const STYLES = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .fade-up { animation: fadeUp 0.35s ease-out both; }

  @keyframes pop {
    0%   { transform: scale(0.6); opacity: 0; }
    100% { transform: scale(1);   opacity: 1; }
  }
  .pop { animation: pop 0.35s cubic-bezier(0.2,0.8,0.2,1) both; }

  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .no-scrollbar::-webkit-scrollbar { display: none; }

  @media (prefers-reduced-motion: reduce) {
    .fade-up, .pop { animation: none !important; }
  }
`;

/* ---------- helpers ---------- */

function initialOf(name?: string) {
  return (name || '?').trim().charAt(0).toUpperCase();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ---------- Page ---------- */

export default function GameEntry() {
  const { id } = useParams();
  const nav = useNavigate();
  const [game, setGame] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [totalWins, setTotalWins] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [anbiyams, setAnbiyams] = useState<any[]>([]);

  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [isNewPlayer, setIsNewPlayer] = useState(false);
  const [age, setAge] = useState('');
  const [anbiyam, setAnbiyam] = useState('');
  const [successData, setSuccessData] = useState<any>(null);

  useEffect(() => {
    loadGame();
    loadRecent();
    loadTotal();
    loadAnbiyams();
    checkQueue();
    const interval = setInterval(checkQueue, 5000);
    return () => clearInterval(interval);
  }, [id]);

  async function loadAnbiyams() {
    const { data } = await supabase.from('anbiyams').select('*').order('name');
    if (data) setAnbiyams(data);
  }

  async function checkQueue() {
    const db = await dbPromise;
    const q = await db.getAll('winQueue');
    setPendingCount(q.length);
    if (navigator.onLine) {
      flushQueue().then(() => {
        loadRecent();
        loadTotal();
      });
    }
  }

  async function loadGame() {
    const { data } = await supabase.from('games').select('*').eq('id', id).single();
    setGame(data);
  }

  async function loadRecent() {
    const { data } = await supabase
      .from('wins')
      .select('id, recorded_at, players(name, age, anbiyam)')
      .eq('game_id', id)
      .eq('status', 'active')
      .order('recorded_at', { ascending: false })
      .limit(15);
    setRecent(data || []);
  }

  async function loadTotal() {
    const { count } = await supabase
      .from('wins')
      .select('id', { count: 'exact', head: true })
      .eq('game_id', id)
      .eq('status', 'active');
    setTotalWins(count || 0);
  }

  async function handleSearch(q: string) {
    setSearch(q);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const searchTerm = q.trim().toLowerCase();
    const { data } = await supabase
      .from('players')
      .select('*')
      .ilike('name_normalized', `%${searchTerm}%`)
      .limit(5);
    setResults(data || []);
  }

  async function submitWin() {
    const playerName = selectedPlayer ? selectedPlayer.name : search;
    const playerAge = selectedPlayer ? selectedPlayer.age : parseInt(age);
    const playerAnbiyam = selectedPlayer ? selectedPlayer.anbiyam : anbiyam;

    const client_uuid = crypto.randomUUID();
    const payload = {
      client_uuid,
      name: playerName,
      age: playerAge,
      anbiyam: playerAnbiyam,
      game_id: id,
      recorded_at: new Date().toISOString(),
    };

    const db = await dbPromise;
    await db.put('winQueue', payload);
    setPendingCount((p) => p + 1);
    setIsOpen(false);

    if (navigator.onLine) {
      const { data, error } = await supabase.rpc('record_win', {
        p_client_uuid: client_uuid,
        p_name: playerName,
        p_age: playerAge,
        p_anbiyam: playerAnbiyam,
        p_game_id: id,
        p_recorded_at: payload.recorded_at,
      });
      if (!error && data) {
        await db.delete('winQueue', client_uuid);
        setPendingCount((p) => p - 1);
        setSuccessData(data);
        setTotalWins((n) => n + 1);
        loadRecent();
      }
    }
    resetForm();
  }

  function resetForm() {
    setSearch('');
    setResults([]);
    setSelectedPlayer(null);
    setIsNewPlayer(false);
    setAge('');
    setAnbiyam('');
  }

  const closeSheet = () => {
    setIsOpen(false);
    resetForm();
  };

  if (!game) return null;

  const sheetTitle = successData
    ? 'All set'
    : isNewPlayer
    ? 'New Player'
    : selectedPlayer
    ? 'Confirm Winner'
    : 'Find Player';

  const showSearch = !selectedPlayer && !isNewPlayer && !successData;
  const showConfirm = !!selectedPlayer && !successData;
  const showNewPlayer = isNewPlayer && !successData;
  const showSuccess = !!successData;

  return (
    <>
      <style>{STYLES}</style>

      <div className="h-[100dvh] bg-[var(--bg)] text-[var(--ink)] flex flex-col">
        {/* ---------- Header ---------- */}
        <header className="flex-shrink-0 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--line)] z-20">
          <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
            <button
              type="button"
              onClick={() => nav('/c')}
              aria-label="Back"
              className="w-9 h-9 -ml-2 rounded-full flex items-center justify-center text-[var(--ink-2)] hover:bg-[var(--surface-2)] active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="font-bold text-base truncate flex-1">{game.name}</h1>
            <StatusPill pending={pendingCount} online={navigator.onLine} />
          </div>
        </header>

        {/* ---------- Main (fixed top items + scrollable list) ---------- */}
        <main className="flex-1 min-h-0 w-full max-w-2xl mx-auto flex flex-col pt-5">
          {/* Timer (pinned) */}
          {game.timer_seconds > 0 && (
            <div className="flex-shrink-0 px-4 sm:px-6 mb-5">
              <Timer gameId={game.id} durationSeconds={game.timer_seconds} />
            </div>
          )}

          {/* Total wins (pinned) */}
          <div className="flex-shrink-0 px-4 sm:px-6 pb-5 mb-2 border-b border-[var(--line)]">
            <div className="flex items-start justify-between">
              
              {/* Left: Total Wins stacked vertically */}
              <div className="flex flex-col">
                <span className="label mb-1">Total Wins</span>
                <span className="dot-num text-4xl sm:text-5xl leading-none">
                  {totalWins}
                </span>
              </div>
              
              {/* Right: Showing */}
              <div className="flex flex-col items-end">
                <span className="label mb-1">Showing</span>
                <span className="text-sm font-mono tabular-nums text-[var(--ink-2)]">
                  {String(recent.length).padStart(2, '0')}
                  {totalWins > recent.length ? (
                    <span className="text-[var(--ink-3)]"> / {totalWins}</span>
                  ) : null}
                </span>
              </div>

            </div>
          </div>

          {/* Recent list (scrollable, no visible scrollbar) */}
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar overflow-x-hidden px-4 sm:px-6 pb-4">
            <div className="label mb-3 pt-2">Recent Wins</div>

            {recent.length === 0 ? (
              <div className="py-16 text-center fade-up">
                <p className="text-sm text-[var(--ink-2)] font-semibold">
                  No winners yet
                </p>
                <p className="text-xs text-[var(--ink-3)] mt-1">
                  Tap add below to record the first one.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--line)] border-t border-[var(--line)] fade-up">
                {recent.map((w) => (
                  <li key={w.id} className="py-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-sm font-bold text-[var(--ink-2)] flex-shrink-0">
                      {initialOf(w.players?.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[15px] truncate">
                        {w.players?.name || 'Unknown'}
                      </div>
                      <div className="text-[11px] font-mono text-[var(--ink-3)] mt-0.5">
                        {w.players?.age || '?'} yrs · {w.players?.anbiyam || '—'}
                      </div>
                    </div>
                    <div className="text-[11px] font-mono text-[var(--ink-3)] tabular-nums">
                      {formatTime(w.recorded_at)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </main>

        {/* ---------- Docked action ---------- */}
        <div className="flex-shrink-0 bg-[var(--bg)] border-t border-[var(--line)] pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="w-full h-12 rounded-xl bg-[var(--ink)] text-[var(--bg)] font-bold text-sm tracking-[0.06em] uppercase inline-flex items-center justify-center gap-2 active:scale-[0.99] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              <Plus size={18} /> Add Winner
            </button>
          </div>
        </div>

        {/* ---------- Sheet ---------- */}
        <BottomSheet open={isOpen} onClose={closeSheet} title={sheetTitle}>
          {/* Search */}
          {showSearch && (
            <div className="fade-up">
              <div className="relative mb-3 w-full">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-3)] pointer-events-none"
                  size={18}
                />
                <input
                  autoFocus
                  className="input !pl-[44px] !pr-[44px]"
                  placeholder="Search by name"
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                />
                {search.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleSearch('')}
                    aria-label="Clear"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-[var(--ink-3)] hover:bg-[var(--surface-2)]"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {search.length < 2 && (
                <p className="text-xs text-[var(--ink-3)] text-center py-8">
                  Type at least 2 characters
                </p>
              )}

              {search.length >= 2 && results.length > 0 && (
                <ul className="divide-y divide-[var(--line)]">
                  {results.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedPlayer(p)}
                        className="w-full text-left py-3 flex items-center gap-3 hover:bg-[var(--surface-2)] rounded-lg px-2 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {initialOf(p.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{p.name}</div>
                          <div className="text-[11px] font-mono text-[var(--ink-3)]">
                            {p.age} yrs · {p.anbiyam || '—'}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {search.length >= 2 && (
                <button
                  type="button"
                  onClick={() => setIsNewPlayer(true)}
                  className="w-full mt-3 py-3 px-4 rounded-xl border border-dashed border-[var(--line)] text-[var(--accent)] font-semibold text-sm flex items-center gap-2 hover:bg-[var(--accent-soft)] hover:border-[var(--accent)] transition-colors"
                >
                  <Plus size={16} />
                  <span className="truncate">Create "{search}"</span>
                </button>
              )}
            </div>
          )}

          {/* Confirm */}
          {showConfirm && (
            <div className="fade-up">
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-xl font-bold mx-auto mb-3 text-[var(--ink-2)]">
                  {initialOf(selectedPlayer.name)}
                </div>
                <h3 className="text-2xl font-bold">{selectedPlayer.name}</h3>
                <p className="text-xs font-mono text-[var(--ink-3)] mt-1">
                  {selectedPlayer.age} yrs · {selectedPlayer.anbiyam || 'No Anbiyam'}
                </p>
              </div>
              <button
                type="button"
                onClick={submitWin}
                className="w-full h-12 rounded-xl bg-[var(--ink)] text-[var(--bg)] font-bold text-sm tracking-[0.06em] uppercase inline-flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                <Check size={18} /> Confirm Win
              </button>
              <button
                type="button"
                onClick={() => setSelectedPlayer(null)}
                className="w-full h-11 rounded-xl mt-2 bg-transparent text-[var(--ink-2)] font-semibold text-sm hover:bg-[var(--surface-2)] transition-colors"
              >
                Wrong person
              </button>
            </div>
          )}

          {/* New player */}
          {showNewPlayer && (
            <div className="fade-up">
              <label className="label block mb-2">Name</label>
              <input
                className="input mb-4"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <label className="label block mb-2">Age</label>
              <input
                className="input mb-4"
                type="number"
                inputMode="numeric"
                placeholder="Age"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />

              <div className="flex items-baseline justify-between mb-2">
                <span className="label">Anbiyam</span>
                <span className="label">Optional</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-6">
                {anbiyams.map((a) => {
                  const active = anbiyam === a.name;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setAnbiyam(active ? '' : a.name)}
                      className={`px-3 h-8 rounded-full text-xs font-semibold border transition-colors ${
                        active
                          ? 'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]'
                          : 'bg-transparent text-[var(--ink)] border-[var(--line)] hover:border-[var(--ink-3)]'
                      }`}
                    >
                      {a.name}
                    </button>
                  );
                })}
                {anbiyams.length === 0 && (
                  <div className="text-xs text-[var(--ink-3)]">
                    No anbiyams created by admin.
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={submitWin}
                disabled={!age}
                className="w-full h-12 rounded-xl bg-[var(--ink)] text-[var(--bg)] font-bold text-sm tracking-[0.06em] uppercase inline-flex items-center justify-center gap-2 active:scale-[0.99] transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                <Check size={18} /> Confirm Win
              </button>
            </div>
          )}

          {/* Success */}
          {showSuccess && (
            <div className="fade-up text-center">
              <div className="w-12 h-12 rounded-full bg-[var(--green)]/15 text-[var(--green)] flex items-center justify-center mx-auto mb-4 pop">
                <Check size={22} strokeWidth={3} />
              </div>
              <h3 className="text-xl font-bold">{successData.player_name}</h3>
              <p className="text-xs font-mono text-[var(--ink-3)] mt-1">Added to winners</p>

              <div className="grid grid-cols-2 gap-2 mt-6">
                <div className="bg-[var(--surface-2)] rounded-xl py-4">
                  <div className="text-2xl font-bold tabular-nums">
                    {successData.total_wins}
                  </div>
                  <div className="label mt-1">Total Wins</div>
                </div>
                <div className="bg-[var(--surface-2)] rounded-xl py-4">
                  <div className="text-2xl font-bold tabular-nums">
                    {successData.distinct_games}
                  </div>
                  <div className="label mt-1">Games Won</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSuccessData(null)}
                className="w-full h-12 rounded-xl mt-6 bg-[var(--ink)] text-[var(--bg)] font-bold text-sm tracking-[0.06em] uppercase inline-flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                <Plus size={18} /> Add Another
              </button>
            </div>
          )}
        </BottomSheet>
      </div>
    </>
  );
}