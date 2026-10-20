import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';

const adminLinks = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/games', label: 'Games' },
  { to: '/admin/coordinators', label: 'Coordinators' },
  { to: '/admin/anbiyams', label: 'Anbiyams' },
  { to: '/admin/winners', label: 'Winners' },
  { to: '/admin/prizes', label: 'Prizes' },
  { to: '/admin/settings', label: 'Settings' },
  { to: '/display', label: 'Display Mode' },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const nav = useNavigate();
  const [theme, setTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  async function doSignOut() {
    await supabase.auth.signOut();
    await signOut();
    nav('/login');
  }

  return (
    <div className="grid grid-cols-[286px_1fr] min-h-screen max-[980px]:grid-cols-1">
      <aside className="m-4 rounded-[28px] bg-[var(--surface)] p-5 flex flex-col gap-4 max-[980px]:hidden">
        <div className="flex items-center gap-2 px-2">
          <div className="grid grid-cols-3 gap-[3px]">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="w-[6px] h-[6px] rounded-full"
                style={{ background: i === 4 ? 'var(--accent)' : 'var(--ink)' }}
              />
            ))}
          </div>
          <span className="font-mono font-bold text-lg tracking-wider">CONTEST</span>
        </div>

        {profile?.role === 'admin' && (
          <nav className="flex flex-col gap-1">
            {adminLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `px-3 h-10 rounded-xl flex items-center text-sm font-semibold transition ${
                    isActive
                      ? 'bg-[var(--ink)] text-[var(--bg)]'
                      : 'text-[var(--ink-2)] hover:bg-[var(--surface-2)]'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        )}

        <div className="mt-auto flex flex-col gap-2">
          <button className="btn alt" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
          <button className="btn alt" onClick={doSignOut}>
            Sign out
          </button>
          <div className="label px-2 pt-2 truncate">{profile?.display_name}</div>
        </div>
      </aside>

      <div className="flex flex-col min-w-0">
        <main className="px-6 pb-10 pt-2 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}