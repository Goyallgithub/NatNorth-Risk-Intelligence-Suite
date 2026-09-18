import paymentData from "@/public/data/payment_shield.json";
import categorizerData from "@/public/data/categorizer.json";
import smeData from "@/public/data/sme_pulse.json";
import { Panel, StampLink } from "@/components/Blueprint";
import { ConfusionHeatmap, RocChart, PrChart } from "@/components/Charts";
import { formatMetric, formatPct } from "@/lib/utils";

export default function LabPage() {
  const psLr = paymentData.logistic_regression;
  const psXgb = paymentData.xgboost;
  const catLr = categorizerData.logistic_regression;
  const catRf = categorizerData.random_forest;
  const smeLr = smeData.logistic_regression;
  const smeRf = smeData.random_forest;

  return (
    <div className="mod">
      <Panel serial="LAB / MODEL PERFORMANCE">
        <div className="mod-hero">
          <div>
            <h1 className="bp-title">Model Lab</h1>
            <p className="bp-body">
              Held-out metrics, imbalance handling, and model selection rationale across fraud,
              merchant categorisation, and SME early-warning.
            </p>
          </div>
          <div className="mod-metrics">
            {[
              ["Split", "75 / 25 stratified"],
              ["Imbalance", "class_weight / scale_pos_weight"],
              ["Primary (fraud)", "PR-AUC > ROC alone"],
              ["Explainability", "Keep LR even if tree wins AUC"],
            ].map(([k, v]) => (
              <div key={k} className="border border-white/15 p-2.5">
                <p className="bp-label">{k}</p>
                <p className="mt-1 text-xs text-white/85 sm:text-sm">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel serial="MOD-01 / PAYMENT SHIELD">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold uppercase tracking-wide sm:text-xl">
              Kaggle credit-card fraud
            </h2>
            <p className="bp-body mt-1 max-w-3xl">
              ULB Credit Card Fraud (OpenML 1597 / Kaggle mlg-ulb). Fraud rate{" "}
              {formatPct(paymentData.meta.fraud_rate)}. LR for coefficients; XGBoost for
              PR-AUC under extreme imbalance.
            </p>
          </div>
          <StampLink href="/payment-shield" hot>
            Live scorer →
          </StampLink>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <MetricTable
            aLabel="LogReg"
            bLabel="XGBoost"
            rows={[
              ["ROC-AUC", psLr.roc_auc, psXgb.roc_auc],
              ["PR-AUC", psLr.pr_auc, psXgb.pr_auc],
              ["Recall", psLr.recall, psXgb.recall],
              ["F1", psLr.f1, psXgb.f1],
            ]}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="bp-label mb-2">ROC</p>
              <RocChart
                curves={[
                  { name: "LR", data: psLr.roc_curve, color: "#5EF2FF" },
                  { name: "XGB", data: psXgb.roc_curve, color: "#FF4D5E" },
                ]}
              />
            </div>
            <div>
              <p className="bp-label mb-2">PR</p>
              <PrChart
                curves={[
                  { name: "LR", data: psLr.pr_curve, color: "#5EF2FF" },
                  { name: "XGB", data: psXgb.pr_curve, color: "#FF4D5E" },
                ]}
              />
            </div>
          </div>
        </div>
      </Panel>

      <div className="mod-split">
        <Panel serial="MOD-02 / CATEGORIZER">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold uppercase tracking-wide sm:text-xl">
                Merchant text
              </h2>
              <p className="bp-body mt-1">
                TF-IDF + LR (readable n-gram weights) vs TF-IDF + RF (noise-robust).
              </p>
            </div>
            <StampLink href="/categorizer">Live categorizer →</StampLink>
          </div>
          <MetricTable
            aLabel="TF-IDF+LR"
            bLabel="TF-IDF+RF"
            rows={[
              ["Accuracy", catLr.accuracy, catRf.accuracy],
              ["Macro-F1", catLr.macro_f1, catRf.macro_f1],
              ["Weighted-F1", catLr.weighted_f1, catRf.weighted_f1],
            ]}
          />
          <div className="mt-4">
            <p className="bp-label mb-2">LR confusion (10×10)</p>
            <ConfusionHeatmap
              matrix={catLr.confusion_matrix}
              labels={catLr.confusion_matrix_labels}
            />
          </div>
        </Panel>

        <Panel serial="MOD-03 / SME PULSE">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold uppercase tracking-wide sm:text-xl">
                SME early-warning
              </h2>
              <p className="bp-body mt-1">
                Account-level distress from cash-flow features. Trajectories show lead time.
                Distress rate {formatPct(smeData.meta.distress_rate)}.
              </p>
            </div>
            <StampLink href="/sme-pulse">Trajectories →</StampLink>
          </div>
          <MetricTable
            aLabel="LogReg"
            bLabel="Random Forest"
            rows={[
              ["ROC-AUC", smeLr.roc_auc, smeRf.roc_auc],
              ["PR-AUC", smeLr.pr_auc, smeRf.pr_auc],
              ["Recall", smeLr.recall, smeRf.recall],
              ["F1", smeLr.f1, smeRf.f1],
            ]}
          />
        </Panel>
      </div>
    </div>
  );
}

function MetricTable({
  rows,
  aLabel,
  bLabel,
}: {
  rows: [string, number, number][];
  aLabel: string;
  bLabel: string;
}) {
  return (
    <table className="mt-3 w-full text-left text-sm">
      <thead>
        <tr className="border-b border-white/20 text-[10px] uppercase tracking-[0.16em] text-[var(--bp-cyan)]">
          <th className="py-2 font-normal">Metric</th>
          <th className="py-2 font-normal">{aLabel}</th>
          <th className="py-2 font-normal">{bLabel}</th>
        </tr>
      </thead>
      <tbody className="tabular-nums">
        {rows.map(([m, a, b]) => (
          <tr key={m} className="border-b border-white/10">
            <td className="py-2 text-white/70">{m}</td>
            <td className="py-2 text-[var(--bp-cyan)]">{formatMetric(a)}</td>
            <td className="py-2">{formatMetric(b)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
