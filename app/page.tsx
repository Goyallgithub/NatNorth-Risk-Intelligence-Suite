import Link from "next/link";
import { ArrowRight, ShieldAlert, Tags, Building2 } from "lucide-react";
import paymentData from "@/public/data/payment_shield.json";
import categorizerData from "@/public/data/categorizer.json";
import smeData from "@/public/data/sme_pulse.json";
import { Card, SectionTitle } from "@/components/Card";
import { MetricCard } from "@/components/MetricCard";
import { formatMetric, formatPct } from "@/lib/utils";

const modules = [
  {
    href: "/payment-shield",
    title: "Payment Shield",
    icon: ShieldAlert,
    metricLabel: "Best ROC-AUC",
    metric: Math.max(
      paymentData.logistic_regression.roc_auc,
      paymentData.xgboost.roc_auc
    ),
    blurb: "APP fraud scoring with coefficient-level explainability + voice linguistic risk.",
  },
  {
    href: "/categorizer",
    title: "Smart Categorizer",
    icon: Tags,
    metricLabel: "Best Macro-F1",
    metric: Math.max(
      categorizerData.logistic_regression.macro_f1,
      categorizerData.random_forest.macro_f1
    ),
    blurb: "TF-IDF classifiers turning messy UK merchant strings into 10 spend categories.",
  },
  {
    href: "/sme-pulse",
    title: "SME Pulse",
    icon: Building2,
    metricLabel: "Best ROC-AUC",
    metric: Math.max(
      smeData.logistic_regression.roc_auc,
      smeData.random_forest.roc_auc
    ),
    blurb: "Cash-flow early-warning trajectories that climb before distress materialises.",
  },
];

const why = [
  {
    title: "APP fraud liability (post Oct-2024)",
    body: "UK PSR mandatory reimbursement shifted more APP fraud cost onto banks. The decision problem is imbalanced classification under regulatory explainability constraints: you need high recall on rare fraud without blocking legitimate payments, and you must justify why a payment was challenged. Payment Shield pairs an interpretable Logistic Regression scorer (live coefficient contributions) with XGBoost as the performance ceiling, plus a voice channel for social-engineering language.",
  },
  {
    title: "Transaction categorisation quality",
    body: "Downstream personal finance insights, affordability checks, and marketing propensity models all depend on clean merchant categories. Bank feed strings are noisy (truncation, refs, casing). Smart Categorizer shows a TF-IDF + LR baseline whose n-gram weights you can read, versus TF-IDF + Random Forest for tougher overlaps — evaluated with per-category F1 and a full 10×10 confusion matrix.",
  },
  {
    title: "SME early-warning monitoring",
    body: "Relationship managers cannot review every SME monthly. An early-warning score from cash-flow features (runway, overdraft days, inflow volatility, late supplier payments) lets the bank intervene months before default. SME Pulse trains account-level distress models and visualises monthly score trajectories crossing a high-risk threshold before the label realises.",
  },
];

export default function OverviewPage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-natnorth-border bg-hero-glow px-6 py-14 sm:px-10 sm:py-16">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-natnorth-purple/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-natnorth-coral/5 blur-3xl" />

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-natnorth-purple">
          Data Science Portfolio · NatWest Interview
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold tracking-tight text-natnorth-charcoal sm:text-5xl">
          NatNorth Risk Intelligence Suite
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-natnorth-muted sm:text-lg">
          Three real banking DS problems — APP fraud liability, transaction
          categorisation quality, and SME early-warning — solved with offline-trained
          classical ML, full evaluation rigor, and in-browser explainability. Not a GenAI wrapper.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/evaluation"
            className="inline-flex items-center gap-2 rounded-full bg-natnorth-purple px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-natnorth-purple/25 transition hover:bg-natnorth-purple-dark"
          >
            See model evaluation <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/payment-shield"
            className="inline-flex items-center gap-2 rounded-full border border-natnorth-border bg-white/80 px-5 py-2.5 text-sm font-semibold text-natnorth-charcoal backdrop-blur transition hover:border-natnorth-purple/30"
          >
            Try live fraud scoring
          </Link>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          <MetricCard
            label="Payment Shield ROC-AUC"
            value={Math.max(paymentData.logistic_regression.roc_auc, paymentData.xgboost.roc_auc)}
            accent
            hint={`Fraud rate ${formatPct(paymentData.meta.fraud_rate)} · ${paymentData.meta.n_samples} txns`}
          />
          <MetricCard
            label="Categorizer Macro-F1"
            value={Math.max(
              categorizerData.logistic_regression.macro_f1,
              categorizerData.random_forest.macro_f1
            )}
            hint={`${categorizerData.meta.n_categories} categories · ${categorizerData.meta.n_samples} strings`}
          />
          <MetricCard
            label="SME Pulse ROC-AUC"
            value={Math.max(smeData.logistic_regression.roc_auc, smeData.random_forest.roc_auc)}
            hint={`${smeData.meta.n_smes} SMEs × ${smeData.meta.n_months} months`}
          />
        </div>
      </section>

      {/* Module cards */}
      <section>
        <SectionTitle
          eyebrow="Modules"
          title="Three problems. Six models. One suite."
          subtitle="Each module trains an interpretable baseline and a stronger ensemble, then exports metrics, curves, and demo samples as static JSON."
        />
        <div className="grid gap-5 md:grid-cols-3">
          {modules.map((m) => (
            <Link key={m.href} href={m.href} className="group block">
              <Card className="h-full">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-natnorth-purple-soft text-natnorth-purple transition group-hover:bg-natnorth-purple group-hover:text-white">
                  <m.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-xl font-bold text-natnorth-charcoal">
                  {m.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-natnorth-muted">{m.blurb}</p>
                <div className="mt-5 flex items-end justify-between border-t border-natnorth-border pt-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-natnorth-muted">
                      {m.metricLabel}
                    </p>
                    <p className="font-display text-2xl font-bold text-natnorth-purple">
                      {formatMetric(m.metric)}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-natnorth-purple opacity-0 transition group-hover:opacity-100">
                    Open <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Why these problems */}
      <section>
        <SectionTitle
          eyebrow="Case study brief"
          title="Why these three problems"
          subtitle="Written as a DS scoping brief — problem, constraint, and modelling implication — not marketing copy."
        />
        <div className="grid gap-5 lg:grid-cols-3">
          {why.map((w) => (
            <Card key={w.title} hover={false}>
              <h3 className="font-display text-lg font-bold text-natnorth-charcoal">{w.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-natnorth-muted">{w.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Methodology strip */}
      <section className="rounded-3xl border border-natnorth-border bg-white p-6 sm:p-8">
        <SectionTitle
          eyebrow="Methodology"
          title="Offline ML → static artifacts → explainable UI"
        />
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { n: "01", t: "Synthesise", d: "Realistic UK-banking feature distributions in /ml" },
            { n: "02", t: "Train & evaluate", d: "Baseline + strong model, full metric suite, imbalance handling" },
            { n: "03", t: "Export JSON", d: "Coefficients, curves, matrices, samples → /public/data" },
            { n: "04", t: "Explain live", d: "Client-side LR math + charts so interviewers never dig into code" },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl bg-natnorth-cream p-4">
              <p className="font-mono text-xs font-bold text-natnorth-purple">{s.n}</p>
              <p className="mt-1 font-display font-bold text-natnorth-charcoal">{s.t}</p>
              <p className="mt-1 text-xs leading-relaxed text-natnorth-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
