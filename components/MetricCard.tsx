import { cn, formatMetric } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  decimals = 3,
  hint,
  accent = false,
}: {
  label: string;
  value: number;
  decimals?: number;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "border p-2.5 sm:p-3",
        accent ? "border-[var(--bp-cyan)]/50 bg-[var(--bp-cyan)]/5" : "border-white/15"
      )}
    >
      <p className="bp-label">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-xl font-bold tabular-nums sm:text-2xl",
          accent ? "text-[var(--bp-cyan)]" : "text-white"
        )}
      >
        {formatMetric(value, decimals)}
      </p>
      {hint && <p className="mt-0.5 text-[10px] text-white/40">{hint}</p>}
    </div>
  );
}
