# NatNorth ML Pipeline

Offline Python scripts that generate synthetic banking datasets, train models, evaluate them, and export static JSON into `public/data/` for the Next.js frontend.

## Setup

```bash
pip install pandas numpy scikit-learn xgboost matplotlib
```

## Run (from repo root or `/ml`)

```bash
cd ml
python payment_shield.py   # → public/data/payment_shield.json + public/datasets/payment_shield_dataset.csv
python categorizer.py      # → public/data/categorizer.json + public/datasets/categorizer_dataset.csv
python sme_pulse.py        # → public/data/sme_pulse.json + public/datasets/sme_pulse_dataset.csv
```

## What each script does

| Script | Problem | Models | Why both |
|--------|---------|--------|----------|
| `payment_shield.py` | APP fraud (~3% positive) | Logistic Regression + XGBoost | LR = coefficient explainability for regulated decisions; XGB = non-linear performance ceiling |
| `categorizer.py` | Merchant text → 10 categories | TF-IDF+LR + TF-IDF+RF | LR = interpretable n-gram weights; RF = noise-robust |
| `sme_pulse.py` | SME distress early-warning | Logistic Regression + Random Forest | LR = credit-committee audit trail; RF = interaction effects |

## Outputs

- **JSON** in `public/data/` — metrics, curves, confusion matrices, feature importances, demo samples (consumed by the UI).
- **CSV** in `public/datasets/` — full synthetic datasets (for Colab / interview walkthrough).

No live Python server is required at runtime. Retrain locally whenever you want fresh artifacts, then redeploy the static JSON.
