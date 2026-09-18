# NatNorth Risk Intelligence Suite

A data science portfolio web app for a **NatWest-style data science interview**. It showcases classical ML on three real banking problems, not a GenAI chatbot wrapper.

**Live brand:** fictional bank **NatNorth** (deep purple `#5A287D`, charcoal, coral risk accents).

## The three problems

1. **Payment Shield**: APP fraud detection under post-Oct 2024 reimbursement liability. Logistic Regression (explainable) + XGBoost (performance). Live client-side LR scoring + optional Voice Payment Check (Whisper + GPT-4o-mini linguistic risk).
2. **Smart Categorizer**: noisy UK merchant strings → 10 categories. TF-IDF + Logistic Regression + TF-IDF + Random Forest.
3. **SME Pulse**: early-warning distress from cash-flow features. Logistic Regression + Random Forest, with 12-month risk trajectories.

## Architecture

```
/ml/*.py          → train offline → export JSON + CSV
/public/data/     → static metrics consumed by Next.js
/public/datasets/ → CSV sheets for Colab / interview
/app              → Next.js 14 App Router UI
/app/api/voice-risk → ONLY serverless route (OpenAI)
```

No database. No live Python backend. Deployable on **Vercel**.

## Quick start

```bash
# 1. Install JS deps
npm install

# 2. (Optional) retrain ML artifacts
pip install pandas numpy scikit-learn xgboost matplotlib
python ml/payment_shield.py
python ml/categorizer.py
python ml/sme_pulse.py

# 3. Voice feature (optional locally)
cp .env.example .env.local
# set OPENAI_API_KEY=sk-...

# 4. Dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push repo → Import on Vercel
2. Set env var `OPENAI_API_KEY` (required only for Voice Payment Check)
3. Deploy. Everything else is static.

## Interview walkthrough

| If they ask… | Show them… |
|---|---|
| Why LR and XGBoost? | `/evaluation` + Payment Shield “Why these models” |
| How is the live score calculated? | Payment Shield formula box + contribution bars |
| Show me the data | `public/datasets/*.csv` or About page links |
| Re-run training | Upload `ml/NatNorth_ML_Colab.ipynb` to Google Colab |
| Class imbalance? | `class_weight='balanced'` / `scale_pos_weight` documented on Evaluation |

## Stack

- Next.js 14 · TypeScript · Tailwind · Framer Motion · Recharts
- Python: pandas, numpy, scikit-learn, xgboost

## Author

**Bhavya Goyal**: CS undergrad, Codeforces Expert. Built to demonstrate feature engineering, imbalanced classification, explainability and evaluation rigor.
