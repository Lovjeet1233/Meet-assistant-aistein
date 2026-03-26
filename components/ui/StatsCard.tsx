export function StatsCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-primary p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-tertiary">{label}</p>
      <p className="mt-1 text-[28px] font-semibold leading-tight text-primary">{value}</p>
    </div>
  );
}
