"use client";

import paymentData from "@/public/data/payment_shield.json";
import categorizerData from "@/public/data/categorizer.json";
import smeData from "@/public/data/sme_pulse.json";
import { Card, SectionTitle } from "@/components/Card";
import { MetricCard } from "@/components/MetricCard";
import {
  ConfusionHeatmap,
  PrChart,
  RocChart,
} from "@/components/Charts";
import { FormulaBox } from "@/components/ExplainBox";
import { formatMetric, formatPct } from "@/lib/utils";

function MetricsTable({
  rows,
}: {
  rows: { metric: string; a: number; b: number; aLabel: string; bLabel: string }[];
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-natnorth-border text-xs uppercase tracking-wider text-natnorth-muted">
          <th className="pb-2 text-left">Metric</th>
          <th className="pb-2 text-left">{rows[0]?.aLabel}</th>
          <th className="pb-2 text-left">{rows[0]?.bLabel}</th>
        </tr>
      </thead>
      <tbody className="tabular-nums">
        {rows.map((r) => (
          <tr key={r.metric} className="border-b border-natnorth-border/50">
            <td className="py-2 font-medium">{r.metric}</td>
            <td className="py-2 font-semibold text-natnorth-purple">{formatMetric(r.a)}</td>
            <td className="py-2 font-semibold">{formatMetric(r.b)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function EvaluationPage() {
  const psLr = paymentData.logistic_regression;
  const psXgb = paymentData.xgboost;
  const catLr = categorizerData.logistic_regression;
  const catRf = categorizerData.random_forest;
  const smeLr = smeData.logistic_regression;
  const smeRf = smeData.random_forest;

  return (
    <div className="space-y-12">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-natnorth-purple">
          Evaluation centerpiece
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-natnorth-charcoal sm:text-4xl">
          Model Evaluation
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-natnorth-muted sm:text-base">
          Everything an interviewer needs without opening the code: dataset design,
          class balance, split, model choice rationale, and the full metric suite.
        </p>
      </div>

      {/* Scorecard */}
      <section>
        <SectionTitle eyebrow="Scorecard" title="Headline metrics across all modules" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard label="Payment Shield best ROC-AUC" value={Math.max(psLr.roc_auc, psXgb.roc_auc)} accent />
          <MetricCard label="Payment Shield best PR-AUC" value={Math.max(psLr.pr_auc, psXgb.pr_auc)} />
          <MetricCard label="Categorizer best Macro-F1" value={Math.max(catLr.macro_f1, catRf.macro_f1)} />
          <MetricCard label="Categorizer best Accuracy" value={Math.max(catLr.accuracy, catRf.accuracy)} />
          <MetricCard label="SME Pulse best ROC-AUC" value={Math.max(smeLr.roc_auc, smeRf.roc_auc)} accent />
          <MetricCard label="SME Pulse best PR-AUC" value={Math.max(smeLr.pr_auc, smeRf.pr_auc)} />
        </div>
      </section>

      <FormulaBox
        title="Shared evaluation protocol"
        formula={`Train / Test = 75% / 25% (stratified)
ROC-AUC = ∫ TPR d(FPR)
PR-AUC  = ∫ Precision d(Recall)   ← preferred under imbalance
F1 = 2 · Precision · Recall / (Precision + Recall)`}
        steps={[
          "All tasks use stratified train/test splits so rare positive rates are preserved in both folds.",
          "For fraud / distress we report PR-AUC alongside ROC-AUC — ROC can look optimistic when negatives dominate.",
          "Class imbalance is handled explicitly (class_weight or scale_pos_weight), not via naive accuracy chasing.",
          "Confusion matrices are shown raw (counts) so you can reason about false positives vs false negatives in business terms.",
          "Interpretable baselines are kept even when ensembles win on AUC — banking decisions need audit trails.",
        ]}
      />

      {/* Payment Shield */}
      <ModuleBlock
        title="1 · Payment Shield"
        why={paymentData.meta.why_models}
        facts={[
          `n = ${paymentData.meta.n_samples} transactions`,
          `Fraud rate = ${formatPct(paymentData.meta.fraud_rate)}`,
          `Features = ${paymentData.meta.n_features}`,
          `Split = ${paymentData.meta.train_test_split}/${paymentData.meta.test_size}`,
          `Imbalance: ${paymentData.meta.class_imbalance_handling.logistic_regression}`,
          `Imbalance: ${paymentData.meta.class_imbalance_handling.xgboost}`,
        ]}
        rationale="Logistic Regression was retained despite (sometimes) lower ensemble AUC because APP fraud decisions after the Oct-2024 reimbursement regime require coefficient-level explainability for regulatory review and customer challenge letters. XGBoost is the production-performance candidate: it captures interactions like new-payee × night-time × high spend z-score that a linear model misses. We optimise and report PR-AUC because a 3–4% positive rate makes accuracy and even ROC easy to game."
        table={
          <MetricsTable
            rows={[
              { metric: "Accuracy", a: psLr.accuracy, b: psXgb.accuracy, aLabel: "LogReg", bLabel: "XGBoost" },
              { metric: "Precision", a: psLr.precision, b: psXgb.precision, aLabel: "LogReg", bLabel: "XGBoost" },
              { metric: "Recall", a: psLr.recall, b: psXgb.recall, aLabel: "LogReg", bLabel: "XGBoost" },
              { metric: "F1", a: psLr.f1, b: psXgb.f1, aLabel: "LogReg", bLabel: "XGBoost" },
              { metric: "ROC-AUC", a: psLr.roc_auc, b: psXgb.roc_auc, aLabel: "LogReg", bLabel: "XGBoost" },
              { metric: "PR-AUC", a: psLr.pr_auc, b: psXgb.pr_auc, aLabel: "LogReg", bLabel: "XGBoost" },
            ]}
          />
        }
        roc={[
          { name: "LR", data: psLr.roc_curve, color: "#5A287D" },
          { name: "XGB", data: psXgb.roc_curve, color: "#E4002B" },
        ]}
        pr={[
          { name: "LR", data: psLr.pr_curve, color: "#5A287D" },
          { name: "XGB", data: psXgb.pr_curve, color: "#E4002B" },
        ]}
        cm={psLr.confusion_matrix}
        cmLabels={["Legit", "Fraud"]}
      />

      {/* Categorizer */}
      <ModuleBlock
        title="2 · Smart Categorizer"
        why={categorizerData.meta.why_models}
        facts={[
          `n = ${categorizerData.meta.n_samples} descriptions`,
          `${categorizerData.meta.n_categories} categories`,
          `Vectorizer: ${categorizerData.meta.vectorizer}`,
          `Split = ${categorizerData.meta.train_test_split}/${categorizerData.meta.test_size}`,
        ]}
        rationale="Short merchant text is a classic sparse high-dimensional problem. TF-IDF + Logistic Regression is the right first model: fast, strong, and you can point at the coefficient on 'TESCO' to explain Groceries. Random Forest on the same TF-IDF space captures non-linear token combinations (e.g. AMAZON + PRIME vs AMAZON.CO.UK) and is more robust when feed noise truncates distinctive tokens. We evaluate macro-F1 so rare categories like Rent/Mortgage are not drowned by Shopping volume."
        table={
          <MetricsTable
            rows={[
              { metric: "Accuracy", a: catLr.accuracy, b: catRf.accuracy, aLabel: "TF-IDF+LR", bLabel: "TF-IDF+RF" },
              { metric: "Macro-F1", a: catLr.macro_f1, b: catRf.macro_f1, aLabel: "TF-IDF+LR", bLabel: "TF-IDF+RF" },
              { metric: "Weighted-F1", a: catLr.weighted_f1, b: catRf.weighted_f1, aLabel: "TF-IDF+LR", bLabel: "TF-IDF+RF" },
            ]}
          />
        }
        cm={catLr.confusion_matrix}
        cmLabels={catLr.confusion_matrix_labels}
        hideCurves
      />

      {/* SME */}
      <ModuleBlock
        title="3 · SME Pulse"
        why={smeData.meta.why_models}
        facts={[
          `${smeData.meta.n_smes} SMEs × ${smeData.meta.n_months} months = ${smeData.meta.n_panel_rows} panel rows`,
          `Distress rate = ${formatPct(smeData.meta.distress_rate)}`,
          `Train accounts = ${smeData.meta.n_train_accounts}`,
          `Row used: ${smeData.meta.training_row}`,
          `Imbalance: ${smeData.meta.class_imbalance_handling.logistic_regression}`,
          `Imbalance: ${smeData.meta.class_imbalance_handling.random_forest}`,
        ]}
        rationale="Credit committees challenge coefficient signs — 'does more overdraft usage really increase distress odds?' — so Logistic Regression is the governance-friendly model. Random Forest exists because cash-flow deterioration is interactive: short runway combined with high inflow volatility is worse than either alone. Training on the month-12 snapshot keeps evaluation at account level; trajectories then apply the fitted scorer month-by-month to show lead time before distress."
        table={
          <MetricsTable
            rows={[
              { metric: "Accuracy", a: smeLr.accuracy, b: smeRf.accuracy, aLabel: "LogReg", bLabel: "Random Forest" },
              { metric: "Precision", a: smeLr.precision, b: smeRf.precision, aLabel: "LogReg", bLabel: "Random Forest" },
              { metric: "Recall", a: smeLr.recall, b: smeRf.recall, aLabel: "LogReg", bLabel: "Random Forest" },
              { metric: "F1", a: smeLr.f1, b: smeRf.f1, aLabel: "LogReg", bLabel: "Random Forest" },
              { metric: "ROC-AUC", a: smeLr.roc_auc, b: smeRf.roc_auc, aLabel: "LogReg", bLabel: "Random Forest" },
              { metric: "PR-AUC", a: smeLr.pr_auc, b: smeRf.pr_auc, aLabel: "LogReg", bLabel: "Random Forest" },
            ]}
          />
        }
        roc={[
          { name: "LR", data: smeLr.roc_curve, color: "#5A287D" },
          { name: "RF", data: smeRf.roc_curve, color: "#E4002B" },
        ]}
        pr={[
          { name: "LR", data: smeLr.pr_curve, color: "#5A287D" },
          { name: "RF", data: smeRf.pr_curve, color: "#E4002B" },
        ]}
        cm={smeLr.confusion_matrix}
        cmLabels={["Healthy", "Distressed"]}
      />
    </div>
  );
}

function ModuleBlock({
  title,
  why,
  facts,
  rationale,
  table,
  roc,
  pr,
  cm,
  cmLabels,
  hideCurves,
}: {
  title: string;
  why: string;
  facts: string[];
  rationale: string;
  table: React.ReactNode;
  roc?: { name: string; data: { x: number; y: number }[]; color?: string }[];
  pr?: { name: string; data: { x: number; y: number }[]; color?: string }[];
  cm: number[][];
  cmLabels: string[];
  hideCurves?: boolean;
}) {
  return (
    <section className="space-y-4 rounded-3xl border border-natnorth-border bg-white p-5 sm:p-8">
      <h2 className="font-display text-2xl font-bold text-natnorth-charcoal">{title}</h2>
      <div className="flex flex-wrap gap-2">
        {facts.map((f) => (
          <span
            key={f}
            className="rounded-full bg-natnorth-purple-soft px-3 py-1 text-[11px] font-medium text-natnorth-purple"
          >
            {f}
          </span>
        ))}
      </div>
      <p className="text-sm leading-relaxed text-natnorth-muted">
        <span className="font-semibold text-natnorth-charcoal">Why these models: </span>
        {rationale}
      </p>
      <p className="text-xs italic text-natnorth-muted">{why}</p>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card hover={false}>{table}</Card>
        <Card hover={false}>
          <h3 className="mb-3 font-display font-bold">Confusion matrix</h3>
          <ConfusionHeatmap matrix={cm} labels={cmLabels} />
        </Card>
        {!hideCurves && roc && (
          <Card hover={false}>
            <h3 className="mb-3 font-display font-bold">ROC curve</h3>
            <RocChart curves={roc} />
          </Card>
        )}
        {!hideCurves && pr && (
          <Card hover={false}>
            <h3 className="mb-3 font-display font-bold">Precision–Recall curve</h3>
            <PrChart curves={pr} />
          </Card>
        )}
      </div>
    </section>
  );
}
