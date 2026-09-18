"use client";

import { useState } from "react";
import smeData from "@/public/data/sme_pulse.json";
import { Card, SectionTitle } from "@/components/Card";
import { MetricCard } from "@/components/MetricCard";
import {
  ConfusionHeatmap,
  ImportanceBar,
  RocChart,
  TrajectoryChart,
} from "@/components/Charts";
import { FormulaBox, WhyModelBox } from "@/components/ExplainBox";
import { formatMetric, cn } from "@/lib/utils";

export default function SmePulsePage() {
  const lr = smeData.logistic_regression;
  const rf = smeData.random_forest;
  const [selected, setSelected] = useState(smeData.trajectories[0].sme_id);
  const traj = smeData.trajectories.find((t) => t.sme_id === selected)!;

  return (
    <div className="space-y-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-natnorth-purple">
          Module 03
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-natnorth-charcoal sm:text-4xl">
          SME Pulse
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-natnorth-muted sm:text-base">
          Early-warning distress monitoring from monthly cash-flow features.
          Watch risk climb before the distress label realises.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <MetricCard label="LR ROC-AUC" value={lr.roc_auc} accent />
        <MetricCard label="RF ROC-AUC" value={rf.roc_auc} />
        <MetricCard label="LR PR-AUC" value={lr.pr_auc} />
        <MetricCard
          label="Distress rate"
          value={smeData.meta.distress_rate * 100}
          decimals={1}
          hint={`${smeData.meta.n_smes} SME accounts`}
        />
      </div>

      <WhyModelBox text={smeData.meta.why_models} />

      <Card hover={false} className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SectionTitle
            eyebrow="Trajectory demo"
            title="Monthly distress score"
            subtitle="Pick an SME. The red dashed line is the high-risk threshold (60)."
          />
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="rounded-xl border border-natnorth-border bg-white px-3 py-2 text-sm outline-none ring-natnorth-purple/30 focus:ring-2"
          >
            {smeData.trajectories.map((t) => (
              <option key={t.sme_id} value={t.sme_id}>
                {t.sme_id} · {t.true_distressed ? "Distressed" : "Healthy"}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-3 text-xs">
          <span
            className={cn(
              "rounded-full px-3 py-1 font-semibold",
              traj.true_distressed
                ? "bg-red-50 text-natnorth-coral"
                : "bg-emerald-50 text-emerald-700"
            )}
          >
            True label: {traj.true_distressed ? "Distressed within 6m" : "Healthy"}
          </span>
          {traj.crossed_high_risk_month != null && (
            <span className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-800">
              Crossed high-risk at month {traj.crossed_high_risk_month}
            </span>
          )}
        </div>

        <TrajectoryChart
          data={traj.months}
          threshold={smeData.high_risk_threshold}
          crossedMonth={traj.crossed_high_risk_month}
        />
      </Card>

      <FormulaBox
        title="How the monthly distress score is produced"
        formula={`z_i = (x_i − μ_i) / σ_i
logit = β₀ + Σ β_i · z_i
distress_score = 100 × σ(logit)
high_risk if distress_score ≥ 60`}
        steps={[
          "Models train on the month-12 snapshot per SME (account-level label: distressed_within_6_months).",
          "For trajectories, we apply the fitted LR (and RF) to each of the 12 monthly feature rows.",
          "Score is the predicted probability × 100, so you can watch risk climb before the terminal label.",
          "Threshold 60 is a policy choice for RM outreach; tune via precision-recall tradeoff on the PR curve.",
          "Features: monthly inflow/outflow, overdraft days, late supplier payments, 3m inflow volatility, cash runway.",
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card hover={false}>
          <h3 className="mb-3 font-display font-bold">Feature importances (LR coefs)</h3>
          <ImportanceBar data={lr.feature_importances} />
        </Card>
        <Card hover={false}>
          <h3 className="mb-3 font-display font-bold">ROC curves</h3>
          <RocChart
            curves={[
              { name: "LR", data: lr.roc_curve, color: "#5A287D" },
              { name: "RF", data: rf.roc_curve, color: "#E4002B" },
            ]}
          />
        </Card>
        <Card hover={false}>
          <h3 className="mb-3 font-display font-bold">LR confusion matrix</h3>
          <ConfusionHeatmap matrix={lr.confusion_matrix} labels={["Healthy", "Distressed"]} />
        </Card>
        <Card hover={false}>
          <h3 className="mb-3 font-display font-bold">Metrics side-by-side</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-natnorth-border text-xs uppercase text-natnorth-muted">
                <th className="pb-2 text-left">Metric</th>
                <th className="pb-2 text-left">LR</th>
                <th className="pb-2 text-left">RF</th>
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
                <tr key={n} className="border-b border-natnorth-border/50">
                  <td className="py-2 font-medium">{n}</td>
                  <td className="py-2 font-semibold text-natnorth-purple">{formatMetric(a)}</td>
                  <td className="py-2 font-semibold">{formatMetric(b)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
