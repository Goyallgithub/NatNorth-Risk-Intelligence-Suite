"use client";

import Link from "next/link";
import { useState } from "react";
import paymentData from "@/public/data/payment_shield.json";
import categorizerData from "@/public/data/categorizer.json";
import smeData from "@/public/data/sme_pulse.json";
import { VoiceOrb, type VoiceResult } from "@/components/VoiceOrb";
import { VoiceErrorBoundary } from "@/components/VoiceErrorBoundary";
import { formatMetric, formatPct } from "@/lib/utils";

const modules = [
  {
    href: "/payment-shield",
    title: "Fraud",
    blurb: "Card fraud under imbalance",
    metric: Math.max(
      paymentData.logistic_regression.roc_auc,
      paymentData.xgboost.roc_auc
    ),
    unit: "ROC-AUC",
  },
  {
    href: "/categorizer",
    title: "Spend class",
    blurb: "Noisy merchant strings",
    metric: Math.max(
      categorizerData.logistic_regression.macro_f1,
      categorizerData.random_forest.macro_f1
    ),
    unit: "Macro-F1",
  },
  {
    href: "/sme-pulse",
    title: "SME warn",
    blurb: "Cash-flow early warning",
    metric: Math.max(smeData.logistic_regression.roc_auc, smeData.random_forest.roc_auc),
    unit: "ROC-AUC",
  },
];

export default function HomePage() {
  const [voice, setVoice] = useState<VoiceResult | null>(null);
  const fraudRate = paymentData.meta.fraud_rate;

  return (
    <div className="dash">
      {/* Problem strip */}
      <section className="dash-problem">
        <p className="dash-kicker">The problem NatNorth solves</p>
        <h1>
          Banks lose money when fraud, messy transactions, and SME distress go
          unexplained.
        </h1>
        <p>
          One risk OS: score rare fraud on Kaggle-scale data ({formatPct(fraudRate)} positive),
          classify merchant text, and warn on SME cash-flow — with live explainability and voice
          coercion checks.
        </p>
      </section>

      {/* Main one-shot grid */}
      <section className="dash-grid">
        <aside className="dash-side">
          <p className="dash-label">Modules</p>
          {modules.map((m) => (
            <Link key={m.href} href={m.href} className="dash-mod">
              <div>
                <strong>{m.title}</strong>
                <span>{m.blurb}</span>
              </div>
              <div className="dash-mod-metric">
                <em>{formatMetric(m.metric)}</em>
                <small>{m.unit}</small>
              </div>
            </Link>
          ))}
          <Link href="/lab" className="dash-lab">
            Model Lab →
          </Link>
        </aside>

        <div className="dash-orb">
          <VoiceErrorBoundary>
            <VoiceOrb onResult={setVoice} />
          </VoiceErrorBoundary>
        </div>

        <aside className="dash-side dash-read">
          <p className="dash-label">Live read</p>
          {!voice ? (
            <div className="dash-empty">
              <p>Orb asks. You answer by voice. Risk updates here.</p>
            </div>
          ) : (
            <>
              <div className="dash-flags">
                {(
                  [
                    ["Urgency", voice.urgency_language],
                    ["Coaching", voice.third_party_coaching_language],
                    ["Gift/crypto", voice.mentions_gift_card_or_crypto],
                    ["Remote", voice.mentions_remote_access],
                    ["Secrecy", voice.secrecy_language],
                  ] as const
                ).map(([k, v]) => (
                  <span key={k} className={v ? "on" : ""}>
                    {k}
                  </span>
                ))}
              </div>
              <p className="dash-reason">{voice.one_line_reasoning}</p>
              <div className="dash-score">
                <span>Linguistic risk</span>
                <strong>{voice.overall_linguistic_risk_score}</strong>
                <small>/100</small>
              </div>
            </>
          )}
        </aside>
      </section>

      <nav className="dash-mobile-mods" aria-label="Modules">
        {modules.map((m) => (
          <Link key={m.href} href={m.href}>
            <strong>{m.title}</strong>
            <em>{formatMetric(m.metric)}</em>
          </Link>
        ))}
      </nav>
    </div>
  );
}
