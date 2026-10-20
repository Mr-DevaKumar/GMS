import type { ReactNode } from 'react';

export function PageHead({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex justify-between items-end gap-4 flex-wrap mb-6 mt-2">
      <div>
        <div className="label mb-1">Contest Hub</div>
        <h1 className="text-[clamp(28px,4vw,40px)] font-bold leading-none">{title}</h1>
        {subtitle && <p className="text-[var(--ink-3)] text-sm mt-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

export function Empty({ title, message }: { title: string; message: string }) {
  return (
    <div className="card text-center py-12">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-[var(--ink-3)] text-sm max-w-md mx-auto">{message}</p>
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card">
      <div className="label">{label}</div>
      <div className="text-[clamp(28px,4vw,40px)] font-bold leading-none mt-2 font-mono">
        {value}
      </div>
    </div>
  );
}