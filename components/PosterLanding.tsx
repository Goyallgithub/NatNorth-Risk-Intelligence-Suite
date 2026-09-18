"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import paymentData from "@/public/data/payment_shield.json";
import categorizerData from "@/public/data/categorizer.json";
import smeData from "@/public/data/sme_pulse.json";
import styles from "./PosterLanding.module.css";

const timeline = [
  { minute: 0, label: "Payment received", note: "9 structural features validated" },
  { minute: 0.4, label: "Features standardised", note: "Training mean and scale applied" },
  { minute: 0.9, label: "Log-odds computed", note: "Coefficient contributions summed" },
  { minute: 1.3, label: "Risk ranked", note: "Sigmoid maps score to probability" },
  { minute: 1.8, label: "Decision explained", note: "Drivers ready for analyst review" },
];

const modules = [
  {
    index: "01",
    title: "Payment Shield",
    href: "/payment-shield",
    metric: Math.max(
      paymentData.logistic_regression.roc_auc,
      paymentData.xgboost.roc_auc
    ).toFixed(3),
    unit: "ROC-AUC",
    body: "APP fraud classification with Logistic Regression explanations and XGBoost performance.",
  },
  {
    index: "02",
    title: "Smart Categorizer",
    href: "/categorizer",
    metric: Math.max(
      categorizerData.logistic_regression.macro_f1,
      categorizerData.random_forest.macro_f1
    ).toFixed(3),
    unit: "MACRO-F1",
    body: "Noisy merchant descriptions classified with TF-IDF, linear weights and Random Forest.",
  },
  {
    index: "03",
    title: "SME Pulse",
    href: "/sme-pulse",
    metric: Math.max(
      smeData.logistic_regression.roc_auc,
      smeData.random_forest.roc_auc
    ).toFixed(3),
    unit: "ROC-AUC",
    body: "Cash-flow early warning with account-level evaluation and monthly distress trajectories.",
  },
];

function Words({ children }: { children: string }) {
  return (
    <>
      {children.split(" ").map((word, index) => (
        <span
          className={styles.word}
          style={{ "--word-delay": `${index * 36}ms` } as React.CSSProperties}
          key={`${word}-${index}`}
        >
          {word}&nbsp;
        </span>
      ))}
    </>
  );
}

function progressFor(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  return Math.max(
    0,
    Math.min(1, -rect.top / Math.max(1, rect.height - window.innerHeight))
  );
}

export function PosterLanding() {
  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const wipeRef = useRef<HTMLElement>(null);
  const timelineRef = useRef<HTMLElement>(null);
  const mapRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [timelineIndex, setTimelineIndex] = useState(0);
  const [elapsed, setElapsed] = useState("00:00");
  const [distance, setDistance] = useState("0.00");

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.setAttribute("data-seen", "true");
        });
      },
      { threshold: 0.12 }
    );
    root.querySelectorAll("[data-rev]").forEach((el) => revealObserver.observe(el));

    let frame = 0;
    let currentIndex = -1;

    const renderCanvas = (p: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const points = Array.from({ length: 26 }, (_, i) => {
        const angle = i * 2.399;
        const radius = Math.sqrt(i / 26);
        return {
          x: width * 0.5 + Math.cos(angle) * radius * width * 0.43,
          y: height * 0.5 + Math.sin(angle) * radius * height * 0.42,
        };
      });

      ctx.strokeStyle = "rgba(17,16,16,.18)";
      ctx.lineWidth = 1;
      for (let i = 0; i < points.length; i += 1) {
        for (let j = i + 1; j < points.length; j += 1) {
          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          if (Math.hypot(dx / width, dy / height) < 0.25) {
            ctx.beginPath();
            ctx.moveTo(points[i].x, points[i].y);
            ctx.lineTo(points[j].x, points[j].y);
            ctx.stroke();
          }
        }
      }
      ctx.fillStyle = "#111010";
      points.forEach((point) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 2.1, 0, Math.PI * 2);
        ctx.fill();
      });

      const route = [0, 5, 10, 15, 20, 25, 17, 9].map((i) => points[i]);
      const scaled = p * (route.length - 1);
      const fullSegments = Math.floor(scaled);
      const partial = scaled - fullSegments;
      ctx.strokeStyle = "#DC201E";
      ctx.lineWidth = 2.8;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(route[0].x, route[0].y);
      for (let i = 1; i <= fullSegments; i += 1) ctx.lineTo(route[i].x, route[i].y);
      if (fullSegments < route.length - 1) {
        const from = route[fullSegments];
        const to = route[fullSegments + 1];
        ctx.lineTo(
          from.x + (to.x - from.x) * partial,
          from.y + (to.y - from.y) * partial
        );
      }
      ctx.stroke();

      const from = route[Math.min(fullSegments, route.length - 1)];
      const to = route[Math.min(fullSegments + 1, route.length - 1)];
      const head = {
        x: from.x + (to.x - from.x) * partial,
        y: from.y + (to.y - from.y) * partial,
      };
      ctx.fillStyle = "rgba(220,32,30,.2)";
      ctx.beginPath();
      ctx.arc(head.x, head.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#DC201E";
      ctx.beginPath();
      ctx.arc(head.x, head.y, 4, 0, Math.PI * 2);
      ctx.fill();
    };

    const update = () => {
      frame = 0;
      const heroP = heroRef.current ? progressFor(heroRef.current) : 0;
      const wipeP = wipeRef.current ? progressFor(wipeRef.current) : 0;
      const timelineP = timelineRef.current ? progressFor(timelineRef.current) : 0;
      const mapP = mapRef.current ? progressFor(mapRef.current) : 0;
      root.style.setProperty("--hero-p", String(heroP));
      root.style.setProperty("--wipe-p", String(wipeP));
      root.style.setProperty("--timeline-p", String(timelineP));
      root.style.setProperty("--map-p", String(mapP));

      const scaled = timelineP * (timeline.length - 1);
      const lower = Math.floor(scaled);
      const upper = Math.min(lower + 1, timeline.length - 1);
      const fraction = scaled - lower;
      const minutes =
        timeline[lower].minute +
        (timeline[upper].minute - timeline[lower].minute) * fraction;
      const seconds = Math.round(minutes * 60);
      const nextIndex = Math.min(timeline.length - 1, Math.floor(timelineP * timeline.length));
      setElapsed(
        `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
      );
      setDistance((minutes * 1.85).toFixed(2));
      if (nextIndex !== currentIndex) {
        currentIndex = nextIndex;
        setTimelineIndex(nextIndex);
      }
      renderCanvas(mapP);
    };

    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    requestUpdate();
    return () => {
      revealObserver.disconnect();
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className={styles.root} ref={rootRef}>
      <section className={`${styles.stage} ${styles.heroStage}`} ref={heroRef}>
        <div className={`${styles.pin} ${styles.heroPin}`}>
          <div className={styles.heroGrid} />
          <div className={styles.heroLockup}>
            <p className={styles.strap} data-rev style={{ "--d": "40ms" } as React.CSSProperties}>
              BANKING ML / THREE DECISIONS / ONE AUDIT TRAIL
            </p>
            <h1 className={styles.wordmark} aria-label="NatNorth">
              NAT<span>NORTH</span>
            </h1>
            <div className={styles.heroRule} />
            <div className={styles.heroBottom}>
              <p className={styles.lede}>
                <Words>Classical machine learning for decisions a bank must explain.</Words>
              </p>
              <Link className={styles.primaryAction} href="/evaluation" data-rev>
                INSPECT THE EVIDENCE <span>↗</span>
              </Link>
            </div>
          </div>
          <div className={styles.ambientLine} />
          <p className={styles.stageCount}>01 / 04</p>
        </div>
      </section>

      <section className={`${styles.stage} ${styles.wipeStage}`} ref={wipeRef}>
        <div className={`${styles.pin} ${styles.wipePin}`}>
          <p className={styles.strap}>THE PROMISE</p>
          <div className={styles.wipeStatement}>
            <p aria-hidden="true">
              RISK SCORES MEAN NOTHING WITHOUT THE EVIDENCE BEHIND THEM.
            </p>
            <p className={styles.wipeClone}>
              RISK SCORES MEAN NOTHING WITHOUT THE EVIDENCE BEHIND THEM.
            </p>
          </div>
          <div className={styles.wipeFacts}>
            <span>03 BANKING PROBLEMS</span>
            <span>06 CLASSICAL MODELS</span>
            <span>100% HELD-OUT METRICS</span>
          </div>
          <p className={styles.stageCount}>02 / 04</p>
        </div>
      </section>

      <section className={`${styles.stage} ${styles.timelineStage}`} ref={timelineRef}>
        <div className={`${styles.pin} ${styles.timelinePin}`}>
          <div className={styles.timelineCopy}>
            <p className={styles.strap}>ONE SCORE / FULL TRACE</p>
            <h2>
              FROM PAYMENT TO <span>EXPLAINED DECISION.</span>
            </h2>
            <div className={styles.timelineRows}>
              {timeline.map((item, index) => (
                <div
                  className={`${styles.timelineRow} ${
                    index <= timelineIndex ? styles.activeRow : ""
                  }`}
                  key={item.label}
                >
                  <span>0{index + 1}</span>
                  <strong>{item.label}</strong>
                  <small>{item.note}</small>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.clockPanel}>
            <div className={styles.clockMeta}>
              <span>RUN / PS-042</span>
              <span>{timeline[timelineIndex].label}</span>
            </div>
            <p>ELAPSED</p>
            <strong>{elapsed}</strong>
            <div className={styles.clockFooter}>
              <span>{distance} COMPUTE UNITS</span>
              <span>LIVE LR TRACE</span>
            </div>
            <div className={styles.clockMeter} />
          </div>
          <p className={styles.stageCount}>03 / 04</p>
        </div>
      </section>

      <section className={`${styles.stage} ${styles.mapStage}`} ref={mapRef}>
        <div className={`${styles.pin} ${styles.mapPin}`}>
          <canvas ref={canvasRef} className={styles.mapCanvas} aria-hidden="true" />
          <div className={styles.mapLabels}>
            <span>RAW SIGNALS</span>
            <span>OFFLINE TRAINING</span>
            <span>STATIC JSON</span>
            <span>EXPLAINABLE UI</span>
          </div>
          <div className={styles.mapMessage}>
            <p className={styles.strap}>NO HIDDEN BACKEND / NO THEATRE</p>
            <h2>
              EVERY RESULT HAS A <span>VISIBLE ROUTE.</span>
            </h2>
          </div>
          <p className={styles.stageCount}>04 / 04</p>
        </div>
      </section>

      <section className={styles.moduleBand}>
        <div className={styles.bandHead} data-rev>
          <span>THE SYSTEM</span>
          <h2>THREE DECISIONS. SIX MODELS.</h2>
          <Link href="/evaluation">FULL SCORECARD ↗</Link>
        </div>
        <div className={styles.moduleGrid}>
          {modules.map((module, index) => (
            <Link
              href={module.href}
              className={styles.moduleCell}
              data-rev
              style={{ "--d": `${index * 90}ms` } as React.CSSProperties}
              key={module.title}
            >
              <span>{module.index} / 03</span>
              <h3>{module.title}</h3>
              <p>{module.body}</p>
              <div>
                <strong>{module.metric}</strong>
                <small>{module.unit}</small>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.evidenceBand}>
        <div className={styles.bandHead} data-rev>
          <span>MODEL REGISTER</span>
          <h2>EVIDENCE, NOT ADJECTIVES.</h2>
        </div>
        {[
          ["APP FRAUD", "LOGREG + XGBOOST", "4.1% positive rate", paymentData.logistic_regression.pr_auc.toFixed(3), "PR-AUC"],
          ["MERCHANT TEXT", "TF-IDF LR + RF", "10 categories", categorizerData.logistic_regression.macro_f1.toFixed(3), "MACRO-F1"],
          ["SME DISTRESS", "LOGREG + RF", "500 accounts / 12 months", smeData.logistic_regression.pr_auc.toFixed(3), "PR-AUC"],
        ].map((row, index) => (
          <div
            className={styles.evidenceRow}
            data-rev
            style={{ "--d": `${index * 70}ms` } as React.CSSProperties}
            key={row[0]}
          >
            <h3>{row[0]}</h3>
            <span>{row[1]}</span>
            <span>{row[2]}</span>
            <strong>{row[3]}</strong>
            <small>{row[4]}</small>
          </div>
        ))}
      </section>

      <section className={styles.faqBand}>
        <div className={styles.bandHead} data-rev>
          <span>INTERVIEW NOTES</span>
          <h2>QUESTIONS, ANSWERED.</h2>
        </div>
        {[
          ["WHY LOGISTIC REGRESSION?", "Its signed coefficients produce direct feature contributions. That makes a fraud or credit score challengeable by analysts, customers and governance teams."],
          ["WHY PR-AUC?", "Fraud is rare. Precision-recall performance reveals whether the model finds positive cases without overwhelming operations with false alerts."],
          ["IS THE DATA REAL?", "The data is synthetic and clearly labelled. Its distributions, imbalance and noise are designed to recreate realistic banking modelling constraints."],
          ["WHERE DOES INFERENCE RUN?", "Models train offline in Python. The site reads versioned JSON artifacts, while the live payment score applies exported Logistic Regression parameters in the browser."],
        ].map(([question, answer], index) => (
          <details
            className={styles.faqRow}
            data-rev
            style={{ "--d": `${index * 60}ms` } as React.CSSProperties}
            key={question}
          >
            <summary>{question}<span>+</span></summary>
            <p>{answer}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
