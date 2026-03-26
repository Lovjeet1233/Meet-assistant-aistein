import type { ReactNode } from "react";

const variants = {
  active: "bg-emerald-50 text-emerald-700",
  completed: "bg-slate-100 text-slate-600",
  waiting: "bg-amber-50 text-amber-700",
  admin: "bg-blue-50 text-blue-700",
  deactivated: "bg-red-50 text-red-600",
  "single-use": "bg-slate-100 text-slate-500",
  neutral: "bg-slate-100 text-slate-600",
  appointment: "bg-violet-50 text-violet-800 ring-1 ring-inset ring-violet-200",
} as const;

export type BadgeVariant = keyof typeof variants;

export function Badge({
  variant,
  children,
  className = "",
}: {
  variant: BadgeVariant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
    >
      {variant === "active" ? (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600"
          aria-hidden
        />
      ) : null}
      {children}
    </span>
  );
}
