import Link from "next/link";
import { Panel, StampLink } from "@/components/Blueprint";

export default function AboutPage() {
  return (
    <div className="mod">
      <div className="mod-split">
        <Panel serial="ABOUT / TEAM">
          <h1 className="bp-title">Bhavya Goyal</h1>
          <p className="bp-body mt-3 max-w-xl text-[14px] text-white/70">
            Built NatNorth Risk Intelligence to bring explainable classical ML to banking
            risk: fraud scoring, merchant categorisation, SME early-warning, and voice
            intent checks.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="https://github.com/Goyallgithub"
              target="_blank"
              rel="noreferrer"
              className="bp-stamp"
            >
              GitHub
            </a>
            <StampLink href="/lab" hot>
              Model Lab →
            </StampLink>
          </div>
        </Panel>

        <Panel serial="DATA / ARTIFACTS">
          <p className="bp-label">Datasets & notebooks</p>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li>
              Training notebook:{" "}
              <code className="text-[var(--bp-cyan)]">ml/NatNorth_ML_Colab.ipynb</code>
            </li>
            <li>
              Sample CSVs:{" "}
              <Link href="/datasets/creditcard_fraud_sample.csv" className="text-[var(--bp-cyan)]">
                creditcard fraud
              </Link>
              {" · "}
              <Link href="/datasets/categorizer_dataset.csv" className="text-[var(--bp-cyan)]">
                categorizer
              </Link>
              {" · "}
              <Link href="/datasets/sme_pulse_dataset.csv" className="text-[var(--bp-cyan)]">
                sme pulse
              </Link>
            </li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}
