import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-primary px-6 py-16 text-center">
      <Icon className="mb-4 h-12 w-12 text-slate-300" strokeWidth={1.25} aria-hidden />
      <p className="text-base font-medium text-primary">{title}</p>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-secondary">{description}</p>
      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  );
}
