import { useEffect, useState } from 'react';
import { queueSize } from '../lib/offlineQueue';

export default function SyncBadge() {
  const [size, setSize] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const refresh = () => queueSize().then(setSize);
    refresh();
    const t = setInterval(refresh, 3000);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      clearInterval(t);
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (size === 0 && online) return null;
  return (
    <div className="fixed top-4 right-4 z-50 bg-[var(--ink)] text-[var(--bg)] px-4 py-2 rounded-full font-mono text-xs font-bold">
      {!online ? '📴 Offline' : `⟳ ${size} pending…`}
    </div>
  );
}