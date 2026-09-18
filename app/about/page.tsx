import { Card, SectionTitle } from "@/components/Card";
import { ExternalLink, Globe, FileSpreadsheet, BookOpen, Share2 } from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="space-y-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-natnorth-purple">
          About
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-natnorth-charcoal sm:text-4xl">
          Bhavya Goyal
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-natnorth-muted">
          CS undergrad · Codeforces Expert. I built NatNorth Risk Intelligence Suite to
          demonstrate applied ML thinking: feature engineering, imbalanced classification,
          explainability, and evaluation rigor against real banking problems, not just
          generative AI usage.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <a
          href="https://linkedin.com/in/YOUR_HANDLE"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-natnorth-border bg-white px-4 py-2 text-sm font-semibold text-natnorth-charcoal hover:border-natnorth-purple"
        >
          <Share2 className="h-4 w-4 text-natnorth-purple" /> LinkedIn
        </a>
        <a
          href="https://github.com/YOUR_HANDLE"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-natnorth-border bg-white px-4 py-2 text-sm font-semibold text-natnorth-charcoal hover:border-natnorth-purple"
        >
          <ExternalLink className="h-4 w-4 text-natnorth-purple" /> GitHub
        </a>
        <a
          href="https://your-portfolio.example"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-natnorth-border bg-white px-4 py-2 text-sm font-semibold text-natnorth-charcoal hover:border-natnorth-purple"
        >
          <Globe className="h-4 w-4 text-natnorth-purple" /> Portfolio
        </a>
      </div>

      <section>
        <SectionTitle
          title="What this project proves"
          subtitle="Skills mapped to interview-relevant DS competencies."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {[
            {
              t: "Imbalanced learning",
              d: "APP fraud ~4% positive rate with class_weight / scale_pos_weight and PR-AUC as the primary ranking metric.",
            },
            {
              t: "Explainability",
              d: "Live LR coefficient × z-score contributions for regulated payment decisions.",
            },
            {
              t: "Text classification",
              d: "TF-IDF baselines vs ensembles on noisy merchant strings with per-category F1.",
            },
            {
              t: "Early-warning design",
              d: "Panel features + trajectory scoring so lead time before SME distress is visible.",
            },
            {
              t: "Evaluation literacy",
              d: "ROC, PR, confusion matrices and stratified splits, documented on /evaluation.",
            },
            {
              t: "Product thinking",
              d: "Voice linguistic layer blended with structural ML for APP social-engineering.",
            },
          ].map((x) => (
            <Card key={x.t} hover={false}>
              <h3 className="font-display font-bold text-natnorth-charcoal">{x.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-natnorth-muted">{x.d}</p>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle
          title="Artifacts for the interview"
          subtitle="Upload the Colab notebook and CSVs if they ask to see training live."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <BookOpen className="h-5 w-5 text-natnorth-purple" />
            <h3 className="mt-3 font-display font-bold">Google Colab notebook</h3>
            <p className="mt-2 text-sm text-natnorth-muted">
              Full training walkthrough with comments. Upload{" "}
              <code className="rounded bg-natnorth-purple-soft px-1 text-xs">ml/NatNorth_ML_Colab.ipynb</code>
            </p>
          </Card>
          <Card>
            <FileSpreadsheet className="h-5 w-5 text-natnorth-purple" />
            <h3 className="mt-3 font-display font-bold">Datasets (CSV)</h3>
            <p className="mt-2 text-sm text-natnorth-muted">
              Synthetic sheets in <code className="rounded bg-natnorth-purple-soft px-1 text-xs">public/datasets/</code>: payment_shield, categorizer and sme_pulse.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Link href="/datasets/payment_shield_dataset.csv" className="text-natnorth-purple underline">
                payment_shield_dataset.csv
              </Link>
              <Link href="/datasets/categorizer_dataset.csv" className="text-natnorth-purple underline">
                categorizer_dataset.csv
              </Link>
              <Link href="/datasets/sme_pulse_dataset.csv" className="text-natnorth-purple underline">
                sme_pulse_dataset.csv
              </Link>
            </div>
          </Card>
        </div>
      </section>

      <Card hover={false} className="bg-natnorth-purple text-white">
        <p className="text-sm text-white/70">Brand note</p>
        <p className="mt-1 font-display text-lg font-bold">
          NatNorth is a fictional bank brand for this portfolio, visually echoing NatWest
          (deep purple primary) without claiming affiliation.
        </p>
      </Card>
    </div>
  );
}
