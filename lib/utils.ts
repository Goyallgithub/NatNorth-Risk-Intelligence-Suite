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
  if (score0to100 < 25) return { label: "Low", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" };
  if (score0to100 < 50) return { label: "Medium", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" };
  if (score0to100 < 75) return { label: "High", color: "text-orange-700", bg: "bg-orange-50 border-orange-200" };
  return { label: "Critical", color: "text-natnorth-coral", bg: "bg-red-50 border-red-200" };
}

export function sigmoid(z: number) {
  if (z > 30) return 1;
  if (z < -30) return 0;
  return 1 / (1 + Math.exp(-z));
}
