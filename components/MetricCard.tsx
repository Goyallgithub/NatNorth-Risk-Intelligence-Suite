"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { cn, formatMetric } from "@/lib/utils";

export function AnimatedNumber({
  value,
  decimals = 3,
  prefix = "",
  suffix = "",
  className,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const duration = 900;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      {decimals === 0 ? Math.round(display) : formatMetric(display, decimals)}
      {suffix}
    </span>
  );
}

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
        "rounded-2xl border p-4",
        accent
          ? "border-natnorth-purple/20 bg-natnorth-purple-soft"
          : "border-natnorth-border bg-white"
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-natnorth-muted">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-display text-2xl font-bold",
          accent ? "text-natnorth-purple" : "text-natnorth-charcoal"
        )}
      >
        <AnimatedNumber value={value} decimals={decimals} />
      </p>
      {hint && <p className="mt-1 text-[11px] text-natnorth-muted">{hint}</p>}
    </div>
  );
}
