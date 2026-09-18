"use client";

import { useMemo, useState } from "react";
import categorizerData from "@/public/data/categorizer.json";
import { Card, SectionTitle } from "@/components/Card";
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
    <div className="space-y-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-natnorth-purple">
          Module 02
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-natnorth-charcoal sm:text-4xl">
          Smart Categorizer
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-natnorth-muted sm:text-base">
          Messy UK merchant strings → 10 spend categories. TF-IDF + Logistic Regression
          (interpretable) vs TF-IDF + Random Forest (noise-robust).
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <MetricCard label="LR Accuracy" value={lr.accuracy} accent />
        <MetricCard label="LR Macro-F1" value={lr.macro_f1} />
        <MetricCard label="RF Accuracy" value={rf.accuracy} />
        <MetricCard label="RF Macro-F1" value={rf.macro_f1} />
      </div>

      <WhyModelBox text={categorizerData.meta.why_models} />

      <Card hover={false} className="space-y-4">
        <SectionTitle
          eyebrow="Live demo"
          title="Paste a messy merchant description"
          subtitle="Client-side keyword + vocabulary-coefficient lite scorer approximating the trained LR."
        />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. UBER *TRIP HELP.UBER.COM"
          className="w-full rounded-xl border border-natnorth-border bg-white px-4 py-3 text-sm outline-none ring-natnorth-purple/30 focus:ring-2"
        />
        <div className="flex flex-wrap gap-2">
          {categorizerData.samples.slice(0, 5).map((s) => (
            <button
              key={s.description}
              type="button"
              onClick={() => setText(s.description)}
              className="rounded-full border border-natnorth-border px-3 py-1 text-[11px] text-natnorth-muted hover:border-natnorth-purple hover:text-natnorth-purple"
            >
              {s.description.slice(0, 28)}…
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-natnorth-purple/20 bg-natnorth-purple-soft p-4 sm:col-span-1">
            <p className="text-xs uppercase tracking-wider text-natnorth-muted">Predicted</p>
            <p className="mt-1 font-display text-2xl font-bold text-natnorth-purple">
              {result.category}
            </p>
            <p className="mt-1 text-sm text-natnorth-muted">
              Confidence {formatPct(result.confidence, 1)}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-natnorth-muted">
              Matched tokens
            </p>
            <div className="flex flex-wrap gap-1.5">
              {result.matchedTokens.length === 0 && (
                <span className="text-xs text-natnorth-muted">No strong tokens yet — keep typing</span>
              )}
              {result.matchedTokens.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-natnorth-purple ring-1 ring-natnorth-purple/20"
                >
                  {t}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-natnorth-muted">
              Top category scores
            </p>
            <div className="mt-1 space-y-1">
              {result.scores.slice(0, 4).map((s) => (
                <div key={s.category} className="flex justify-between text-xs">
                  <span>{s.category}</span>
                  <span className="font-mono tabular-nums">{s.score.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <FormulaBox
        title="How live categorisation approximates the trained model"
        formula={`score_c = intercept_c + Σ matched_token coef_{c,token} + keyword_boost_c
category* = argmax_c score_c
confidence ≈ σ(score* − score_2nd)`}
        steps={[
          "Offline we fit TfidfVectorizer (word 1–2 grams) + multinomial Logistic Regression.",
          "We export top vocabulary tokens with per-class coefficients and keyword rules derived from merchant templates.",
          "In the browser, tokens present in your string add their class coefficients; keyword hits add a fixed boost.",
          "Predicted category is argmax over class scores; confidence comes from the top-2 margin.",
          "This is an explainable approximation — full sparse TF-IDF lives in the Python training script / Colab.",
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card hover={false}>
          <h3 className="mb-3 font-display font-bold">Per-category F1 (LR vs RF)</h3>
          <F1BarChart data={categorizerData.per_category_f1_comparison} />
        </Card>
        <Card hover={false}>
          <h3 className="mb-3 font-display font-bold">Confusion matrix (LR, 10×10)</h3>
          <ConfusionHeatmap
            matrix={lr.confusion_matrix}
            labels={lr.confusion_matrix_labels}
          />
        </Card>
      </div>

      <section>
        <SectionTitle title="Sample predictions" subtitle="15 held-out strings with both models." />
        <Card hover={false} className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-xs">
            <thead>
              <tr className="border-b border-natnorth-border text-[10px] uppercase tracking-wider text-natnorth-muted">
                <th className="pb-2 pr-2">Description</th>
                <th className="pb-2 pr-2">True</th>
                <th className="pb-2 pr-2">LR pred</th>
                <th className="pb-2 pr-2">LR conf</th>
                <th className="pb-2 pr-2">RF pred</th>
                <th className="pb-2">RF conf</th>
              </tr>
            </thead>
            <tbody>
              {categorizerData.samples.map((s, i) => (
                <tr key={i} className="border-b border-natnorth-border/50">
                  <td className="max-w-[240px] truncate py-2 pr-2 font-mono">{s.description}</td>
                  <td className="py-2 pr-2 font-semibold">{s.true_category}</td>
                  <td className={cn("py-2 pr-2", s.lr_predicted === s.true_category ? "text-emerald-700" : "text-natnorth-coral")}>
                    {s.lr_predicted}
                  </td>
                  <td className="py-2 pr-2 tabular-nums">{formatPct(s.lr_confidence, 0)}</td>
                  <td className={cn("py-2 pr-2", s.rf_predicted === s.true_category ? "text-emerald-700" : "text-natnorth-coral")}>
                    {s.rf_predicted}
                  </td>
                  <td className="py-2 tabular-nums">{formatPct(s.rf_confidence, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  );
}
