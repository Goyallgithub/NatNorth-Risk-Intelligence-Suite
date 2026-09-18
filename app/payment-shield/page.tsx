"use client";

import { useMemo, useState } from "react";
import paymentData from "@/public/data/payment_shield.json";
import { Panel } from "@/components/Blueprint";
import { MetricCard } from "@/components/MetricCard";
import { ImportanceBar, ConfusionHeatmap, RocChart } from "@/components/Charts";
import { FormulaBox, WhyModelBox } from "@/components/ExplainBox";
import { VoiceOrb, type VoiceResult } from "@/components/VoiceOrb";
import { VoiceErrorBoundary } from "@/components/VoiceErrorBoundary";
import { scorePaymentShield, blendRiskScores } from "@/lib/payment-scoring";
import { formatMetric, formatPct, riskBand, cn } from "@/lib/utils";

type Meta = typeof paymentData.meta & {
  dataset?: {
    name: string;
    kaggle: string;
    openml_id: number;
    reference: string;
    n_full: number;
    sample_csv: string;
  };
  live_features?: string[];
  live_defaults?: Record<string, number>;
  live_ranges?: Record<string, { min: number; max: number; step: number }>;
};

export default function PaymentShieldPage() {
  const lr = paymentData.logistic_regression;
  const xgb = paymentData.xgboost;
  const meta = paymentData.meta as Meta;
  const liveFeatures = meta.live_features ?? ["Amount"];
  const defaults = meta.live_defaults ?? { Amount: 100 };
  const ranges = meta.live_ranges ?? {};

  const [features, setFeatures] = useState<Record<string, number>>(defaults);
  const [voice, setVoice] = useState<VoiceResult | null>(null);

  const scored = useMemo(() => {
    const means = lr.scaler_mean as Record<string, number>;
    const coefs = lr.coefficients as Record<string, number>;
    const scales = lr.scaler_scale as Record<string, number>;
    return scorePaymentShield(
      {
        ...Object.fromEntries(Object.keys(coefs).map((k) => [k, means[k] ?? 0])),
        ...features,
      },
      {
        coefficients: coefs,
        intercept: lr.intercept,
        scaler_mean: means,
        scaler_scale: scales,
      },
      Object.keys(coefs)
    );
  }, [features, lr]);

  const band = riskBand(scored.riskScore);
  const blended = voice
    ? blendRiskScores(scored.riskScore, voice.overall_linguistic_risk_score)
    : null;

  return (
    <div className="mod">
      <Panel serial="MOD-01 / PAYMENT SHIELD">
        <div className="mod-hero">
          <div>
            <h1 className="bp-title">Credit-card fraud live score</h1>
            <p className="bp-body">
              Trained on the{" "}
              <span className="text-[var(--bp-cyan)]">Kaggle ULB Credit Card Fraud</span>{" "}
              dataset ({meta.dataset?.n_full?.toLocaleString() ?? meta.n_samples} txs, ~
              {formatPct(meta.fraud_rate)} fraud). Live LR uses Amount + top PCA drivers.
            </p>
            <p className="bp-note mt-2 text-sm">
              Ref: {meta.dataset?.kaggle ?? "mlg-ulb/creditcardfraud"} · OpenML{" "}
              {meta.dataset?.openml_id ?? 1597}
            </p>
          </div>
          <div className="mod-metrics">
            <MetricCard label="LR ROC-AUC" value={lr.roc_auc} accent />
            <MetricCard label="XGB ROC-AUC" value={xgb.roc_auc} />
            <MetricCard label="XGB PR-AUC" value={xgb.pr_auc} />
            <MetricCard
              label="Fraud rate %"
              value={meta.fraud_rate * 100}
              decimals={3}
              hint="extreme imbalance"
            />
          </div>
        </div>
      </Panel>

      <div className="mod-split">
        <Panel serial="LIVE / STRUCTURAL ML">
          {liveFeatures.map((key) => {
            const r = ranges[key] ?? { min: -5, max: 5, step: 0.1 };
            const val = features[key] ?? 0;
            return (
              <label key={key} className="mb-3 block">
                <span className="mb-1 flex justify-between text-[10px] uppercase tracking-wider text-white/45">
                  <span>{key}</span>
                  <span className="text-[var(--bp-cyan)] tabular-nums">
                    {key === "Amount" ? val.toFixed(0) : val.toFixed(2)}
                  </span>
                </span>
                <input
                  type="range"
                  min={r.min}
                  max={r.max}
                  step={r.step}
                  value={val}
                  onChange={(e) =>
                    setFeatures((f) => ({ ...f, [key]: Number(e.target.value) }))
                  }
                  className="w-full accent-[var(--bp-cyan)]"
                />
              </label>
            );
          })}

          <div className={cn("mt-2 border p-4", band.bg)}>
            <p className="bp-label">ML risk score</p>
            <p className={cn("text-4xl font-bold tabular-nums", band.color)}>
              {scored.riskScore}
              <span className="text-base text-white/40">/100 · {band.label}</span>
            </p>
            <p className="mt-1 text-[11px] text-white/45">
              p = σ({scored.logit.toFixed(3)}) = {formatPct(scored.probability, 2)}
            </p>
          </div>

          <p className="mb-2 mt-4 bp-label">Top contributions (live dims)</p>
          <ImportanceBar
            data={scored.contributions
              .filter((c) => liveFeatures.includes(c.feature))
              .map((c) => ({
                feature: c.feature,
                importance: Number(c.contribution.toFixed(3)),
              }))}
          />
        </Panel>

        <Panel serial="VOICE / INTENT GUARD">
          <VoiceErrorBoundary>
            <VoiceOrb onResult={setVoice} />
          </VoiceErrorBoundary>
          {voice && (
            <div className="mt-4 space-y-2 border border-white/15 p-3">
              <p className="text-sm italic text-white/80">&ldquo;{voice.transcript}&rdquo;</p>
              <p className="text-2xl font-bold text-[var(--bp-red)]">
                Voice {voice.overall_linguistic_risk_score}/100
              </p>
              {blended && (
                <div className="border border-[var(--bp-red)] bg-[var(--bp-red)]/10 p-3">
                  <p className="bp-label !text-[var(--bp-red)]">Combined</p>
                  <p className="text-3xl font-bold">{blended.final}/100</p>
                  <p className="text-[10px] text-white/50">{blended.formula}</p>
                </div>
              )}
            </div>
          )}
        </Panel>
      </div>

      <div className="mod-split">
        <WhyModelBox text={meta.why_models} />
        <FormulaBox
          title="Client-side Logistic Regression"
          formula={`z_i = (x_i − μ_i) / σ_i
logit = β₀ + Σ β_i · z_i
p = 1 / (1 + e^(−logit))
risk = round(p × 100)
contribution_i = β_i · z_i`}
          steps={[
            "Full model trained on Kaggle ULB credit-card fraud (V1–V28 + Amount).",
            "Live sliders edit Amount + top-|coef| PCA dims; other features held at training mean.",
            "Sigmoid → probability → 0–100 score with contribution bars.",
            "With voice: final = 0.6 × ML + 0.4 × linguistic.",
          ]}
        />
      </div>

      <Panel serial="COMPARE / HELD-OUT TEST">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/20 text-[10px] uppercase tracking-wider text-[var(--bp-cyan)]">
                <th className="pb-2 text-left font-normal">Metric</th>
                <th className="pb-2 text-left font-normal">LogReg</th>
                <th className="pb-2 text-left font-normal">XGBoost</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {(
                [
                  ["Accuracy", lr.accuracy, xgb.accuracy],
                  ["Precision", lr.precision, xgb.precision],
                  ["Recall", lr.recall, xgb.recall],
                  ["F1", lr.f1, xgb.f1],
                  ["ROC-AUC", lr.roc_auc, xgb.roc_auc],
                  ["PR-AUC", lr.pr_auc, xgb.pr_auc],
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="bp-label mb-2">ROC</p>
              <RocChart
                curves={[
                  { name: "LR", data: lr.roc_curve, color: "#5EF2FF" },
                  { name: "XGB", data: xgb.roc_curve, color: "#FF4D5E" },
                ]}
              />
            </div>
            <div>
              <p className="bp-label mb-2">LR confusion</p>
              <ConfusionHeatmap matrix={lr.confusion_matrix} labels={["Legit", "Fraud"]} />
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
