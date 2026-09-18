import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatPct(n: number, digits = 1) {
  return `${(n * 100).toFixed(digits)}%`;
}

export function formatMetric(n: number, digits = 3) {
  return n.toFixed(digits);
}

export function riskBand(score0to100: number): {
  label: "Low" | "Medium" | "High" | "Critical";
  color: string;
  bg: string;
} {
  if (score0to100 < 25)
    return { label: "Low", color: "text-[var(--bp-cyan)]", bg: "border-[var(--bp-cyan)]/40 bg-[var(--bp-cyan)]/5" };
  if (score0to100 < 50)
    return { label: "Medium", color: "text-white", bg: "border-white/30 bg-white/5" };
  if (score0to100 < 75)
    return { label: "High", color: "text-[var(--bp-red)]", bg: "border-[var(--bp-red)]/40 bg-[var(--bp-red)]/10" };
  return { label: "Critical", color: "text-[var(--bp-red)]", bg: "border-[var(--bp-red)] bg-[var(--bp-red)]/15" };
}

export function sigmoid(z: number) {
  if (z > 30) return 1;
  if (z < -30) return 0;
  return 1 / (1 + Math.exp(-z));
}
