import type { ReactNode } from 'react';

export function DataTableCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-slate-200 bg-primary shadow-sm ${className}`}
    >
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function DataTable({ children }: { children: ReactNode }) {
  return <table className="w-full min-w-[640px] text-left text-sm text-secondary">{children}</table>;
}

export function DataTableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-slate-100 bg-slate-50">
      <tr>{children}</tr>
    </thead>
  );
}

export function DataTableHeaderCell({
  children,
  className = '',
  align = 'left',
}: {
  children: ReactNode;
  className?: string;
  align?: 'left' | 'right';
}) {
  return (
    <th
      className={`px-4 py-3 text-xs font-medium uppercase tracking-wide text-tertiary ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}
      style={{ letterSpacing: '0.05em' }}
    >
      {children}
    </th>
  );
}

export function DataTableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function DataTableRow({ children }: { children: ReactNode }) {
  return (
    <tr className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50">
      {children}
    </tr>
  );
}

export function DataTableCell({
  children,
  className = '',
  align = 'left',
}: {
  children: ReactNode;
  className?: string;
  align?: 'left' | 'right';
}) {
  return (
    <td className={`px-4 py-3 text-sm text-secondary ${align === 'right' ? 'text-right' : ''} ${className}`}>
      {children}
    </td>
  );
}
