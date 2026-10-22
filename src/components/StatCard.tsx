type StatCardProps = {
  label: string;
  value: string;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
};

export function StatCard({
  label,
  value,
  className,
  labelClassName,
  valueClassName,
}: StatCardProps) {
  return (
    <div className={`rounded-3xl border p-4 ${className ?? "border-slate-200 bg-slate-50/80"}`}>
      <div
        className={`text-xs font-semibold uppercase tracking-[0.14em] ${
          labelClassName ?? "text-slate-500"
        }`}
      >
        {label}
      </div>
      <div
        className={`mt-3 text-2xl font-semibold tracking-tight ${
          valueClassName ?? "text-slate-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
