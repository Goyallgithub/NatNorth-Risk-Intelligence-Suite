"use client";

import { useMemo, useState } from "react";
import paymentData from "@/public/data/payment_shield.json";
import { Card, SectionTitle } from "@/components/Card";
import { MetricCard } from "@/components/MetricCard";
import { ImportanceBar, ConfusionHeatmap, RocChart } from "@/components/Charts";
import { FormulaBox, WhyModelBox } from "@/components/ExplainBox";
import { VoiceOrb } from "@/components/VoiceOrb";
import { scorePaymentShield, blendRiskScores, type PaymentFeatures } from "@/lib/payment-scoring";
import { formatMetric, formatPct, riskBand, cn } from "@/lib/utils";

type VoiceResult = {
  transcript: string;
  urgency_language: boolean;
  third_party_coaching_language: boolean;
  mentions_gift_card_or_crypto: boolean;
  mentions_remote_access: boolean;
  secrecy_language: boolean;
  overall_linguistic_risk_score: number;
  one_line_reasoning: string;
};

const defaults: PaymentFeatures = {
  transaction_amount: 2500,
  recipient_is_new_payee: 1,
  hours_since_last_login: 1.5,
  time_of_day: 2,
  is_first_payment_to_recipient: 1,
  deviation_from_avg_transaction_zscore: 2.8,
  num_payments_today: 4,
  account_age_days: 120,
  is_international: 0,
};

export default function PaymentShieldPage() {
  const lr = paymentData.logistic_regression;
  const xgb = paymentData.xgboost;
  const [features, setFeatures] = useState<PaymentFeatures>(defaults);
  const [voice, setVoice] = useState<VoiceResult | null>(null);

  const scored = useMemo(
    () =>
      scorePaymentShield(features, {
        coefficients: lr.coefficients,
        intercept: lr.intercept,
        scaler_mean: lr.scaler_mean,
        scaler_scale: lr.scaler_scale,
      }),
    [features, lr]
  );

  const band = riskBand(scored.riskScore);
  const blended = voice
    ? blendRiskScores(scored.riskScore, voice.overall_linguistic_risk_score)
    : null;

  const set = (key: keyof PaymentFeatures, value: number) =>
    setFeatures((f) => ({ ...f, [key]: value }));

  const flagChips = voice
    ? [
        { k: "Urgency", v: voice.urgency_language },
        { k: "3rd-party coaching", v: voice.third_party_coaching_language },
        { k: "Gift card / crypto", v: voice.mentions_gift_card_or_crypto },
        { k: "Remote access", v: voice.mentions_remote_access },
        { k: "Secrecy", v: voice.secrecy_language },
      ]
    : [];

  return (
    <div className="space-y-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-natnorth-purple">
          Module 01
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-natnorth-charcoal sm:text-4xl">
          Payment Shield
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-natnorth-muted sm:text-base">
          Live APP-fraud scoring using the trained Logistic Regression coefficients
          (real math in your browser) plus optional voice linguistic risk blending.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <MetricCard label="LR ROC-AUC" value={lr.roc_auc} accent />
        <MetricCard label="XGB ROC-AUC" value={xgb.roc_auc} />
        <MetricCard label="XGB F1" value={xgb.f1} />
        <MetricCard label="Fraud rate" value={paymentData.meta.fraud_rate * 100} decimals={1} hint="imbalanced · class_weight / scale_pos_weight" />
      </div>

      <WhyModelBox text={paymentData.meta.why_models} />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Live scoring form */}
        <Card hover={false} className="space-y-4">
          <SectionTitle
            eyebrow="Live scorer"
            title="Structural ML risk"
            subtitle="Adjust features. Probability updates instantly from exported LR coefficients."
          />

          <Field label={`Amount (£${features.transaction_amount.toFixed(0)})`}>
            <input
              type="range"
              min={10}
              max={15000}
              value={features.transaction_amount}
              onChange={(e) => set("transaction_amount", Number(e.target.value))}
              className="w-full accent-natnorth-purple"
            />
          </Field>
          <Field label={`Deviation z-score (${features.deviation_from_avg_transaction_zscore.toFixed(1)})`}>
            <input
              type="range"
              min={-2}
              max={5}
              step={0.1}
              value={features.deviation_from_avg_transaction_zscore}
              onChange={(e) => set("deviation_from_avg_transaction_zscore", Number(e.target.value))}
              className="w-full accent-natnorth-purple"
            />
          </Field>
          <Field label={`Hours since login (${features.hours_since_last_login})`}>
            <input
              type="range"
              min={0.1}
              max={72}
              step={0.1}
              value={features.hours_since_last_login}
              onChange={(e) => set("hours_since_last_login", Number(e.target.value))}
              className="w-full accent-natnorth-purple"
            />
          </Field>
          <Field label={`Time of day (${features.time_of_day}:00)`}>
            <input
              type="range"
              min={0}
              max={23}
              value={features.time_of_day}
              onChange={(e) => set("time_of_day", Number(e.target.value))}
              className="w-full accent-natnorth-purple"
            />
          </Field>
          <Field label={`Payments today (${features.num_payments_today})`}>
            <input
              type="range"
              min={0}
              max={15}
              value={features.num_payments_today}
              onChange={(e) => set("num_payments_today", Number(e.target.value))}
              className="w-full accent-natnorth-purple"
            />
          </Field>
          <Field label={`Account age days (${features.account_age_days.toFixed(0)})`}>
            <input
              type="range"
              min={7}
              max={3000}
              value={features.account_age_days}
              onChange={(e) => set("account_age_days", Number(e.target.value))}
              className="w-full accent-natnorth-purple"
            />
          </Field>

          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["recipient_is_new_payee", "New payee"],
                ["is_first_payment_to_recipient", "First payment"],
                ["is_international", "International"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => set(key, features[key] ? 0 : 1)}
                className={cn(
                  "rounded-xl border px-2 py-2.5 text-xs font-semibold transition",
                  features[key]
                    ? "border-natnorth-purple bg-natnorth-purple text-white"
                    : "border-natnorth-border bg-white text-natnorth-muted"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className={cn("rounded-2xl border p-4", band.bg)}>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-natnorth-muted">
                  ML risk score
                </p>
                <p className={cn("font-display text-4xl font-bold", band.color)}>
                  {scored.riskScore}
                  <span className="text-lg font-semibold">/100</span>
                </p>
              </div>
              <span className={cn("rounded-full px-3 py-1 text-sm font-bold", band.color)}>
                {band.label}
              </span>
            </div>
            <p className="mt-2 font-mono text-[11px] text-natnorth-muted">
              p = σ({scored.logit.toFixed(3)}) = {formatPct(scored.probability, 2)}
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-natnorth-charcoal">
              Feature contributions (coef × z)
            </p>
            <ImportanceBar
              data={scored.contributions.map((c) => ({
                feature: c.feature,
                importance: Number(c.contribution.toFixed(3)),
              }))}
            />
          </div>
        </Card>

        {/* Voice panel */}
        <Card hover={false} className="glass-purple space-y-4">
          <SectionTitle
            eyebrow="Voice Payment Check"
            title="Linguistic risk orb"
            subtitle="Record a spoken payment intent. Whisper transcribes; GPT-4o-mini extracts coercion signals."
          />
          <VoiceOrb onResult={setVoice} />

          {voice && (
            <div className="space-y-3 rounded-2xl border border-natnorth-border bg-white/90 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-natnorth-muted">
                Transcript
              </p>
              <p className="text-sm italic text-natnorth-charcoal">&ldquo;{voice.transcript}&rdquo;</p>
              <div className="flex flex-wrap gap-2">
                {flagChips.map((f) => (
                  <span
                    key={f.k}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                      f.v
                        ? "bg-red-50 text-natnorth-coral"
                        : "bg-emerald-50 text-emerald-700"
                    )}
                  >
                    {f.k}: {f.v ? "YES" : "no"}
                  </span>
                ))}
              </div>
              <p className="text-sm text-natnorth-muted">{voice.one_line_reasoning}</p>
              <p className="font-display text-2xl font-bold text-natnorth-purple">
                Linguistic score: {voice.overall_linguistic_risk_score}/100
              </p>
              {blended && (
                <div className="rounded-xl bg-natnorth-charcoal p-3 text-white">
                  <p className="text-xs text-white/60">Combined final risk</p>
                  <p className="font-display text-3xl font-bold">{blended.final}/100</p>
                  <p className="mt-1 font-mono text-[11px] text-emerald-300">{blended.formula}</p>
                  <p className="font-mono text-[11px] text-white/50">
                    = 0.6×{scored.riskScore} + 0.4×{voice.overall_linguistic_risk_score}
                  </p>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      <FormulaBox
        title="Logistic Regression scoring (client-side)"
        formula={`z_i = (x_i − μ_i) / σ_i
logit = β₀ + Σ β_i · z_i
p(fraud) = 1 / (1 + e^(−logit))
risk_score = round(p × 100)
contribution_i = β_i · z_i`}
        steps={[
          "Each feature is standardised with the training-set mean (μ) and scale (σ) exported from StandardScaler.",
          "The linear predictor adds intercept β₀ to every coefficient × standardised feature.",
          "Sigmoid maps the logit to a probability in [0,1]; we surface it as a 0 to 100 risk score.",
          "Bars show contribution_i = β_i · z_i. Positive values push toward fraud (regulatory-friendly explainability).",
          "If voice is used: final = 0.6 × ML_score + 0.4 × linguistic_score (structural signal weighted higher).",
        ]}
      />

      {/* Model comparison */}
      <section className="space-y-4">
        <SectionTitle title="Model comparison" subtitle="Logistic Regression vs XGBoost on the held-out 25% test set." />
        <Card hover={false} className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-natnorth-border text-xs uppercase tracking-wider text-natnorth-muted">
                <th className="pb-3 pr-4 font-semibold">Metric</th>
                <th className="pb-3 pr-4 font-semibold">Logistic Regression</th>
                <th className="pb-3 font-semibold">XGBoost</th>
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
              ).map(([name, a, b]) => (
                <tr key={name} className="border-b border-natnorth-border/60">
                  <td className="py-2.5 pr-4 font-medium text-natnorth-charcoal">{name}</td>
                  <td className="py-2.5 pr-4 text-natnorth-purple font-semibold">{formatMetric(a)}</td>
                  <td className="py-2.5 font-semibold text-natnorth-charcoal">{formatMetric(b)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-natnorth-muted">
            Imbalance handling: {paymentData.meta.class_imbalance_handling.logistic_regression} ·{" "}
            {paymentData.meta.class_imbalance_handling.xgboost}
          </p>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card hover={false}>
            <h3 className="mb-3 font-display font-bold">ROC curves</h3>
            <RocChart
              curves={[
                { name: "LR", data: lr.roc_curve, color: "#5A287D" },
                { name: "XGB", data: xgb.roc_curve, color: "#E4002B" },
              ]}
            />
          </Card>
          <Card hover={false}>
            <h3 className="mb-3 font-display font-bold">LR confusion matrix</h3>
            <ConfusionHeatmap
              matrix={lr.confusion_matrix}
              labels={["Legit", "Fraud"]}
            />
          </Card>
        </div>
      </section>

      {/* Sample table */}
      <section>
        <SectionTitle
          title="Sample predictions (test set)"
          subtitle="20 held-out transactions with true labels and both models' fraud probabilities."
        />
        <Card hover={false} className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead>
              <tr className="border-b border-natnorth-border text-[10px] uppercase tracking-wider text-natnorth-muted">
                <th className="pb-2 pr-2">Amount</th>
                <th className="pb-2 pr-2">New payee</th>
                <th className="pb-2 pr-2">Hour</th>
                <th className="pb-2 pr-2">Z-score</th>
                <th className="pb-2 pr-2">True</th>
                <th className="pb-2 pr-2">LR p</th>
                <th className="pb-2">XGB p</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {paymentData.samples.map((s, i) => (
                <tr key={i} className="border-b border-natnorth-border/50">
                  <td className="py-2 pr-2">£{s.transaction_amount.toFixed(0)}</td>
                  <td className="py-2 pr-2">{s.recipient_is_new_payee ? "Yes" : "No"}</td>
                  <td className="py-2 pr-2">{s.time_of_day}</td>
                  <td className="py-2 pr-2">{s.deviation_from_avg_transaction_zscore.toFixed(2)}</td>
                  <td className="py-2 pr-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 font-semibold",
                        s.true_label ? "bg-red-50 text-natnorth-coral" : "bg-emerald-50 text-emerald-700"
                      )}
                    >
                      {s.true_label ? "Fraud" : "Legit"}
                    </span>
                  </td>
                  <td className="py-2 pr-2 font-semibold text-natnorth-purple">
                    {formatPct(s.lr_probability, 1)}
                  </td>
                  <td className="py-2 font-semibold">{formatPct(s.xgb_probability, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-natnorth-muted">{label}</span>
      {children}
    </label>
  );
}
