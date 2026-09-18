"use client";

import { useState } from "react";
import smeData from "@/public/data/sme_pulse.json";
import { Panel } from "@/components/Blueprint";
import { MetricCard } from "@/components/MetricCard";
import { ConfusionHeatmap, ImportanceBar, RocChart, TrajectoryChart } from "@/components/Charts";
import { FormulaBox, WhyModelBox } from "@/components/ExplainBox";
import { formatMetric, cn } from "@/lib/utils";

export default function SmePulsePage() {
  const lr = smeData.logistic_regression;
  const rf = smeData.random_forest;
  const [selected, setSelected] = useState(smeData.trajectories[0].sme_id);
  const traj = smeData.trajectories.find((t) => t.sme_id === selected)!;

  return (
    <div className="mod">
      <Panel serial="MOD-03 / SME PULSE">
        <div className="mod-hero">
          <div>
            <h1 className="bp-title">Early-warning trajectories</h1>
            <p className="bp-body">
              Cash-flow features drive a monthly distress score. Watch risk climb before the
              label realises.
            </p>
          </div>
          <div className="mod-metrics">
            <MetricCard label="LR ROC-AUC" value={lr.roc_auc} accent />
            <MetricCard label="RF ROC-AUC" value={rf.roc_auc} />
            <MetricCard label="LR PR-AUC" value={lr.pr_auc} />
            <MetricCard
              label="Distress %"
              value={smeData.meta.distress_rate * 100}
              decimals={1}
              hint={`${smeData.meta.n_smes} SMEs`}
            />
          </div>
        </div>
      </Panel>

      <Panel serial="TRAJECTORY">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="bp-label">Select SME</p>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="mt-1 border border-white/25 bg-transparent px-3 py-2 text-sm outline-none"
            >
              {smeData.trajectories.map((t) => (
                <option key={t.sme_id} value={t.sme_id} className="bg-[#1a0a2e]">
                  {t.sme_id} · {t.true_distressed ? "Distressed" : "Healthy"}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-wider">
            <span
              className={cn(
                "border px-2 py-1",
                traj.true_distressed
                  ? "border-[var(--bp-red)] text-[var(--bp-red)]"
                  : "border-[var(--bp-cyan)] text-[var(--bp-cyan)]"
              )}
            >
              {traj.true_distressed ? "Distressed ≤6m" : "Healthy"}
            </span>
            {traj.crossed_high_risk_month != null && (
              <span className="border border-white/30 px-2 py-1 text-white/70">
                Crossed threshold @ month {traj.crossed_high_risk_month}
              </span>
            )}
          </div>
        </div>
        <TrajectoryChart
          data={traj.months}
          threshold={smeData.high_risk_threshold}
          crossedMonth={traj.crossed_high_risk_month}
        />
      </Panel>

      <div className="mod-split">
        <WhyModelBox text={smeData.meta.why_models} />
        <FormulaBox
          title="Monthly distress score"
          formula={`z_i = (x_i − μ_i) / σ_i
logit = β₀ + Σ β_i · z_i
score = 100 × σ(logit)
high_risk if score ≥ 60`}
          steps={[
            "Train on month-12 snapshot per SME (account-level label).",
            "Apply fitted LR/RF to each of 12 monthly rows for trajectories.",
            "Threshold 60 is a policy choice for RM outreach.",
            "Features: inflow/outflow, overdraft days, late payments, volatility, runway.",
          ]}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Panel serial="LR COEFS">
          <ImportanceBar data={lr.feature_importances} />
        </Panel>
        <Panel serial="ROC">
          <RocChart
            curves={[
              { name: "LR", data: lr.roc_curve, color: "#5EF2FF" },
              { name: "RF", data: rf.roc_curve, color: "#FF4D5E" },
            ]}
          />
        </Panel>
        <Panel serial="CONFUSION">
          <ConfusionHeatmap matrix={lr.confusion_matrix} labels={["Healthy", "Distressed"]} />
        </Panel>
        <Panel serial="METRICS">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/20 text-[10px] uppercase text-[var(--bp-cyan)]">
                <th className="pb-2 text-left font-normal">Metric</th>
                <th className="pb-2 text-left font-normal">LR</th>
                <th className="pb-2 text-left font-normal">RF</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {(
                [
                  ["Accuracy", lr.accuracy, rf.accuracy],
                  ["Precision", lr.precision, rf.precision],
                  ["Recall", lr.recall, rf.recall],
                  ["F1", lr.f1, rf.f1],
                  ["ROC-AUC", lr.roc_auc, rf.roc_auc],
                  ["PR-AUC", lr.pr_auc, rf.pr_auc],
                ] as const
              ).map(([n, a, b]) => (
                <tr key={n} className="border-b border-white/10">
                  <td className="py-2 text-white/60">{n}</td>
                  <td className="py-2 text-[var(--bp-cyan)]">{formatMetric(a)}</td>
                  <td className="py-2">{formatMetric(b)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>
  );
}
