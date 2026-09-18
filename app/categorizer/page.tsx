"use client";

import { useMemo, useState } from "react";
import categorizerData from "@/public/data/categorizer.json";
import { Panel } from "@/components/Blueprint";
import { MetricCard } from "@/components/MetricCard";
import { ConfusionHeatmap, F1BarChart } from "@/components/Charts";
import { FormulaBox, WhyModelBox } from "@/components/ExplainBox";
import { categorizeDescription } from "@/lib/categorizer-lite";
import { formatPct, cn } from "@/lib/utils";

export default function CategorizerPage() {
  const lr = categorizerData.logistic_regression;
  const rf = categorizerData.random_forest;
  const [text, setText] = useState("TESCO STORES 2931 LONDON");

  const result = useMemo(
    () =>
      categorizeDescription(text, {
        keyword_rules: categorizerData.keyword_rules,
        vocabulary_weights: categorizerData.vocabulary_weights,
        lr_intercept: categorizerData.lr_intercept,
        class_priors: categorizerData.class_priors,
        meta: { categories: categorizerData.meta.categories },
      }),
    [text]
  );

  return (
    <div className="mod">
      <Panel serial="MOD-02 / SMART CATEGORIZER">
        <div className="mod-hero">
          <div>
            <h1 className="bp-title">Merchant → category</h1>
            <p className="bp-body">
              Paste a noisy bank-feed string. Client-side keyword + vocabulary coefficients
              approximate the trained TF-IDF Logistic Regression.
            </p>
          </div>
          <div className="mod-metrics">
            <MetricCard label="LR Accuracy" value={lr.accuracy} accent />
            <MetricCard label="LR Macro-F1" value={lr.macro_f1} />
            <MetricCard label="RF Accuracy" value={rf.accuracy} />
            <MetricCard label="RF Macro-F1" value={rf.macro_f1} />
          </div>
        </div>
      </Panel>

      <div className="mod-split">
        <Panel serial="LIVE / INPUT">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. UBER *TRIP HELP.UBER.COM"
            className="w-full border border-white/25 bg-transparent px-3 py-3 text-sm outline-none focus:border-[var(--bp-cyan)]"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {categorizerData.samples.slice(0, 5).map((s) => (
              <button
                key={s.description}
                type="button"
                onClick={() => setText(s.description)}
                className="border border-white/15 px-2 py-1 text-[10px] text-white/50 hover:border-[var(--bp-cyan)] hover:text-[var(--bp-cyan)]"
              >
                {s.description.slice(0, 26)}…
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="border border-[var(--bp-cyan)]/40 bg-[var(--bp-cyan)]/5 p-3">
              <p className="bp-label">Predicted</p>
              <p className="mt-1 text-2xl font-bold text-[var(--bp-cyan)]">{result.category}</p>
              <p className="mt-1 text-sm text-white/50">
                Confidence {formatPct(result.confidence, 1)}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="bp-label mb-2">Matched tokens</p>
              <div className="flex flex-wrap gap-1.5">
                {result.matchedTokens.length === 0 && (
                  <span className="text-xs text-white/40">Type a merchant string…</span>
                )}
                {result.matchedTokens.map((t) => (
                  <span
                    key={t}
                    className="border border-white/20 px-2 py-0.5 text-[10px] text-[var(--bp-cyan)]"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <p className="bp-label mb-1 mt-3">Top scores</p>
              {result.scores.slice(0, 4).map((s) => (
                <div key={s.category} className="flex justify-between text-xs text-white/60">
                  <span>{s.category}</span>
                  <span className="tabular-nums text-[var(--bp-cyan)]">{s.score.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <div className="flex flex-col gap-3">
          <WhyModelBox text={categorizerData.meta.why_models} />
          <FormulaBox
            title="Lite categoriser"
            formula={`score_c = intercept_c + Σ token coefs + keyword_boost
category* = argmax_c score_c
confidence ≈ σ(score* − score_2nd)`}
            steps={[
              "Offline: TfidfVectorizer (1–2 grams) + multinomial LR.",
              "Export top tokens with per-class coefficients + keyword rules.",
              "Browser: matched tokens add class coefficients.",
              "Argmax + top-2 margin → confidence.",
            ]}
          />
        </div>
      </div>

      <div className="mod-split">
        <Panel serial="F1 / PER CATEGORY">
          <F1BarChart data={categorizerData.per_category_f1_comparison} />
        </Panel>
        <Panel serial="CM / LR">
          <ConfusionHeatmap matrix={lr.confusion_matrix} labels={lr.confusion_matrix_labels} />
        </Panel>
      </div>

      <Panel serial="SAMPLES">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="border-b border-white/20 text-[10px] uppercase tracking-wider text-[var(--bp-cyan)]">
                <th className="pb-2 font-normal">Description</th>
                <th className="pb-2 font-normal">True</th>
                <th className="pb-2 font-normal">LR</th>
                <th className="pb-2 font-normal">RF</th>
              </tr>
            </thead>
            <tbody>
              {categorizerData.samples.map((s, i) => (
                <tr key={i} className="border-b border-white/10">
                  <td className="max-w-[320px] truncate py-2 font-mono">{s.description}</td>
                  <td className="py-2">{s.true_category}</td>
                  <td
                    className={cn(
                      "py-2",
                      s.lr_predicted === s.true_category
                        ? "text-[var(--bp-cyan)]"
                        : "text-[var(--bp-red)]"
                    )}
                  >
                    {s.lr_predicted}
                  </td>
                  <td
                    className={cn(
                      "py-2",
                      s.rf_predicted === s.true_category
                        ? "text-[var(--bp-cyan)]"
                        : "text-[var(--bp-red)]"
                    )}
                  >
                    {s.rf_predicted}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
