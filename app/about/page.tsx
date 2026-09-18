import { Panel } from "@/components/Blueprint";

const COLAB =
  "https://colab.research.google.com/drive/1IHuuetR6fhth8NbpHAeumj3QKwmqQeA5?usp=sharing";
const GITHUB = "https://github.com/Goyallgithub";
const EMAIL = "mailto:baygoyal10@gmail.com";

const EXPERIENCE = [
  {
    role: "Technology & Data Engineering Intern",
    org: "InfoEdge Ventures",
    when: "Apr 2026 – Present",
    points: [
      "Automated deal-sourcing with Python + AI pipelines for VC technical evaluation.",
      "LLM pipelines that turn unstructured market data into structured research.",
    ],
  },
  {
    role: "Computational AI Engineer",
    org: "IIT Bombay · National Quantum Mission",
    when: "Mar 2026 –",
    points: [
      "Gaussian / Bayesian optimisation surrogates to cut simulation compute cost.",
    ],
  },
  {
    role: "Founding Engineer",
    org: "Panha · mental health & safety",
    when: "Oct 2024 – Jun 2025",
    points: [
      "Co-founded and shipped to Play Store & App Store · 25,000+ organic users.",
      "Best student-led startup in Delhi (DPIIT).",
    ],
  },
];

const SKILLS = [
  "Python",
  "C++",
  "TypeScript",
  "scikit-learn",
  "XGBoost",
  "PyTorch",
  "Next.js",
  "SQL",
  "Fraud / risk scoring",
  "Time-series",
  "AWS",
];

export default function AboutPage() {
  return (
    <div className="mod resume">
      <Panel serial="RESUME / ONE PAGER" className="resume-sheet">
        <header className="resume-hero resume-anim" style={{ ["--i" as string]: 0 }}>
          <div>
            <p className="bp-label">Software · Data Science · Banking Tech</p>
            <h1 className="resume-name">Bhavya Goyal</h1>
            <p className="resume-tag">
              Final-year CS · Delhi Technological University · builder for finance &amp; risk
              systems
            </p>
          </div>
          <div className="resume-links">
            <a className="bp-stamp bp-stamp-hot" href={COLAB} target="_blank" rel="noreferrer">
              Colab →
            </a>
            <a className="bp-stamp" href={GITHUB} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a className="bp-stamp" href={EMAIL}>
              Email
            </a>
            <a className="bp-stamp" href="/lab">
              Model Lab
            </a>
          </div>
        </header>

        <p className="resume-summary resume-anim" style={{ ["--i" as string]: 1 }}>
          Love for maths and hard problems. Codeforces Expert (1700+), JEE Main 99.49
          percentile. Scaled a DTU-incubated startup to 25k+ students, ships full-stack + ML,
          now focused on explainable banking risk — fraud, spend classification, SME
          early-warning.
        </p>

        <div className="resume-grid">
          <section className="resume-block resume-anim" style={{ ["--i" as string]: 2 }}>
            <p className="bp-label">Education</p>
            <h2>Delhi Technological University</h2>
            <p className="resume-meta">B.Tech CSE · Jul 2023 – Jun 2027 · New Delhi</p>
            <p className="resume-line">
              Maths · DSA · Deep Learning · Optimisation · NLP · CV
            </p>
          </section>

          <section className="resume-block resume-anim" style={{ ["--i" as string]: 3 }}>
            <p className="bp-label">Selected project</p>
            <h2>NatNorth Risk Intelligence</h2>
            <p className="resume-meta">Next.js · Logistic Regression · XGBoost · scikit-learn</p>
            <p className="resume-line">
              Explainable fraud scoring, TF-IDF categoriser, SME distress trajectories — live
              metrics &amp; demos in this suite.
            </p>
          </section>
        </div>

        <section className="resume-block resume-anim" style={{ ["--i" as string]: 4 }}>
          <p className="bp-label">Experience</p>
          <ul className="resume-exp">
            {EXPERIENCE.map((job) => (
              <li key={job.role + job.org}>
                <div className="resume-exp-head">
                  <div>
                    <strong>{job.role}</strong>
                    <span>{job.org}</span>
                  </div>
                  <em>{job.when}</em>
                </div>
                <ul>
                  {job.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>

        <section className="resume-block resume-anim" style={{ ["--i" as string]: 5 }}>
          <p className="bp-label">Skills</p>
          <div className="resume-skills">
            {SKILLS.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
        </section>

        <section className="resume-block resume-anim" style={{ ["--i" as string]: 6 }}>
          <p className="bp-label">Highlights</p>
          <div className="resume-highlights">
            <span>Codeforces Expert 1700+</span>
            <span>SIH 2025 National Finalist</span>
            <span>DPIIT best student startup</span>
            <span>1st author · DTUNCBB-2026</span>
          </div>
        </section>
      </Panel>
    </div>
  );
}
