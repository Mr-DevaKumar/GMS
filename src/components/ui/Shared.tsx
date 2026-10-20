import { ReactNode } from 'react';
import { X, Check, Loader2 } from 'lucide-react';

export function BottomSheet({ open, onClose, title, children }: { open: boolean, onClose: () => void, title?: string, children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet-content" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{title}</h2>
          <button onClick={onClose} className="p-2 bg-[var(--surface-2)] rounded-full"><X size={20}/></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function StatusPill({ pending, online }: { pending: number, online: boolean }) {
  if (!online) return <div className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-mono font-bold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> OFFLINE</div>;
  if (pending > 0) return <div className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-mono font-bold flex items-center gap-1"><Loader2 size={12} className="animate-spin"/> {pending} PENDING</div>;
  return <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-mono font-bold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> SYNCED</div>;
}

export function DotNumber({ value, size = 'text-6xl' }: { value: number | string, size?: string }) {
  return <span className={`dot-num ${size} leading-none`}>{value}</span>;
}