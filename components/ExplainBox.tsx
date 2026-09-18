"use client";

import { Panel } from "@/components/Blueprint";

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
    <Panel serial="MATH">
      <p className="bp-label">How this score is calculated</p>
      <h3 className="mt-1 text-base font-bold uppercase tracking-wide">{title}</h3>
      <pre className="mt-3 overflow-x-auto border border-white/15 bg-black/30 px-3 py-3 text-[11px] leading-relaxed text-[var(--bp-cyan)]">
        {formula}
      </pre>
      <ol className="mt-3 space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3 text-[12px] text-white/65">
            <span className="text-[var(--bp-cyan)]">{String(i + 1).padStart(2, "0")}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

export function WhyModelBox({ text }: { text: string }) {
  return (
    <div className="border border-dashed border-[var(--bp-cyan)]/40 bg-[var(--bp-cyan)]/5 p-3 sm:p-4">
      <p className="bp-label">Why these models</p>
      <p className="bp-body mt-2 text-[12px] text-white/70 sm:text-[13px]">{text}</p>
    </div>
  );
}
