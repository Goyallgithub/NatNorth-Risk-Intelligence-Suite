"use client";

import { Card } from "@/components/Card";

export function FormulaBox({
  title,
  formula,
  steps,
}: {
  title: string;
  formula: string;
  steps: string[];
}) {
  return (
    <Card className="border-natnorth-purple/15 bg-gradient-to-br from-natnorth-purple-soft/60 to-white" hover={false}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-natnorth-purple">
        How this score is calculated
      </p>
      <h3 className="mt-1 font-display text-lg font-bold text-natnorth-charcoal">{title}</h3>
      <pre className="mt-3 overflow-x-auto rounded-xl bg-natnorth-charcoal px-4 py-3 font-mono text-xs leading-relaxed text-emerald-300 sm:text-sm">
        {formula}
      </pre>
      <ol className="mt-4 space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3 text-sm text-natnorth-slate">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-natnorth-purple text-[11px] font-bold text-white">
              {i + 1}
            </span>
            <span className="leading-relaxed">{s}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

export function WhyModelBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-natnorth-purple/30 bg-natnorth-purple-soft/40 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-natnorth-purple">
        Why these models
      </p>
      <p className="mt-2 text-sm leading-relaxed text-natnorth-slate">{text}</p>
    </div>
  );
}
