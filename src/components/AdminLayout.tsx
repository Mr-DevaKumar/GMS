import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  LayoutDashboard, Gamepad2, Users, Trophy, ListOrdered, 
  Settings, MonitorPlay, LogOut, Tag 
} from 'lucide-react';

const links = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/games', label: 'Games', icon: Gamepad2 },
  { to: '/admin/coordinators', label: 'Coordinators', icon: Users },
  { to: '/admin/anbiyams', label: 'Anbiyams', icon: Tag },
  { to: '/admin/winners', label: 'Winners', icon: ListOrdered },
  { to: '/admin/prizes', label: 'Prize Desk', icon: Trophy },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const nav = useNavigate();

  async function handleSignOut() {
    await supabase.auth.signOut();
    await signOut();
    nav('/login/admin');
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--surface-2)] flex flex-col md:flex-row">
      
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-[var(--surface)] border-r border-[var(--line)] p-4 sticky top-0 h-screen">
        <div className="px-4 mb-8">
          <div className="font-mono font-bold text-xl tracking-widest text-[var(--ink)]">ADMIN OS</div>
          <div className="label mt-1">{profile?.display_name}</div>
        </div>
        
        <nav className="flex-1 flex flex-col gap-1">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition
                ${isActive ? 'bg-[var(--ink)] text-[var(--bg)]' : 'text-[var(--ink-2)] hover:bg-[var(--surface-2)]'}
              `}
            >
              <l.icon size={18} />
              {l.label}
            </NavLink>
          ))}
          <NavLink
            to="/display"
            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-[var(--ink-2)] hover:bg-[var(--surface-2)] mt-4 border border-dashed border-[var(--line)]"
          >
            <MonitorPlay size={18} />
            Display Mode
          </NavLink>
        </nav>

        <button onClick={handleSignOut} className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold text-[var(--accent)] hover:bg-[var(--accent-soft)] transition">
          <LogOut size={18} />
          Sign Out
        </button>
      </aside>

      {/* MOBILE HEADER & BOTTOM NAV */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden sticky top-0 z-20 bg-[var(--surface)] border-b border-[var(--line)] px-4 h-14 flex items-center justify-between">
          <div className="font-mono font-bold tracking-widest">ADMIN</div>
          <button onClick={handleSignOut} className="text-[var(--accent)]"><LogOut size={20}/></button>
        </header>

        <main className="flex-1 pb-20 md:pb-0">
          {children}
        </main>

        {/* MOBILE BOTTOM NAV (Shows 5 items max) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--surface)] border-t border-[var(--line)] flex justify-around items-center h-16 pb-safe z-50">
          {links.slice(0, 5).map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => `
                flex flex-col items-center justify-center w-full h-full gap-1 text-[10px] font-mono
                ${isActive ? 'text-[var(--ink)]' : 'text-[var(--ink-3)]'}
              `}
            >
              <l.icon size={20} className={l.end && window.location.pathname === '/admin' ? 'text-[var(--accent)]' : ''} />
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>

    </div>
  );
}