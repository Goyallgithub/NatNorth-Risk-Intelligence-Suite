"""
SME Pulse - Early-Warning Distress Monitoring
=============================================
Generates synthetic SME cash-flow panel data (500 SMEs x 12 months),
trains Logistic Regression and Random Forest for distressed_within_6_months,
evaluates with the full binary metric suite, and exports 5 example SME
distress-score trajectories for the frontend line charts.

Why these models?
- Logistic Regression: credit / risk committees expect coefficient signs they can
  challenge ("each extra overdraft day lifts log-odds by beta"). Ideal for SME
  early-warning where false positives trigger costly relationship-manager outreach.
- Random Forest: non-linear interactions matter (high volatility x short runway
  is worse than either alone). Provides a performance upper bound and feature
  importance via mean decrease in impurity.
"""

from __future__ import annotations

import json
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings("ignore")

RANDOM_STATE = 42
N_SMES = 500
N_MONTHS = 12
DISTRESS_RATE = 0.18
OUTPUT_PATH = Path(__file__).resolve().parent.parent / "public" / "data" / "sme_pulse.json"
DATASET_CSV = Path(__file__).resolve().parent.parent / "public" / "datasets" / "sme_pulse_dataset.csv"

FEATURE_COLS = [
    "monthly_inflow",
    "monthly_outflow",
    "overdraft_days_used",
    "late_supplier_payments",
    "inflow_volatility_3m",
    "cash_runway_months",
]


def generate_synthetic_panel(n_smes: int = N_SMES, n_months: int = N_MONTHS, seed: int = RANDOM_STATE) -> pd.DataFrame:
    """
    Generate SME x month panel with cash-flow risk features.

    Generation logic
    ----------------
    Each SME draws a latent health parameter. Healthy SMEs have stable inflows,
    low overdraft usage, few late supplier payments, and longer cash runway.
    Distressed SMEs show deteriorating trajectories: rising volatility, shrinking
    runway, more overdraft days -- especially in the final 6 months before label.

    Label = distressed_within_6_months is assigned at the account level from
    the latent health + terminal-period deterioration, then attached to every
    monthly row (account-level outcome, month-level features).
    """
    rng = np.random.default_rng(seed)
    rows = []

    n_distressed = int(round(n_smes * DISTRESS_RATE))
    distressed_ids = set(rng.choice(n_smes, size=n_distressed, replace=False).tolist())

    for sme_id in range(n_smes):
        is_distressed = sme_id in distressed_ids
        base_inflow = rng.lognormal(mean=10.5 if not is_distressed else 10.0, sigma=0.35)
        base_outflow_ratio = rng.uniform(0.72, 0.92) if not is_distressed else rng.uniform(0.88, 1.08)
        runway0 = rng.uniform(4.0, 14.0) if not is_distressed else rng.uniform(1.2, 5.5)
        vol0 = rng.uniform(0.05, 0.18) if not is_distressed else rng.uniform(0.15, 0.45)

        inflows = []
        for month in range(1, n_months + 1):
            # Gradual deterioration with noise so classes overlap (realistic AUC ~0.90+)
            deteriorate = 0.0
            if is_distressed and month >= 7:
                deteriorate = (month - 6) / 6.0 * rng.uniform(0.55, 1.0)

            monthly_inflow = base_inflow * (1 - 0.18 * deteriorate) * rng.lognormal(0, 0.14)
            monthly_outflow = monthly_inflow * (base_outflow_ratio + 0.12 * deteriorate) * rng.lognormal(0, 0.12)
            overdraft_days = int(
                rng.poisson(lam=1.5 + 4.5 * deteriorate + (0 if not is_distressed else 1.2))
            )
            late_supplier = int(
                rng.poisson(lam=0.6 + 2.2 * deteriorate + (0 if not is_distressed else 0.5))
            )
            inflows.append(monthly_inflow)

            window = inflows[-3:]
            inflow_vol = float(np.std(window) / (np.mean(window) + 1e-6)) if len(window) >= 2 else vol0
            inflow_vol = inflow_vol + 0.15 * deteriorate

            cash_runway = max(0.2, runway0 * (1 - 0.35 * deteriorate) + rng.normal(0, 0.55))

            rows.append(
                {
                    "sme_id": f"SME-{sme_id:03d}",
                    "month": month,
                    "monthly_inflow": round(float(monthly_inflow), 2),
                    "monthly_outflow": round(float(monthly_outflow), 2),
                    "overdraft_days_used": int(min(overdraft_days, 28)),
                    "late_supplier_payments": int(min(late_supplier, 15)),
                    "inflow_volatility_3m": round(float(inflow_vol), 4),
                    "cash_runway_months": round(float(cash_runway), 2),
                    "distressed_within_6_months": int(is_distressed),
                }
            )

    df = pd.DataFrame(rows)
    # Account-level label noise (~5%) — some healthy SMEs look distressed and vice versa
    sme_labels = df.groupby("sme_id")["distressed_within_6_months"].first()
    flip_ids = set(rng.choice(sme_labels.index.to_numpy(), size=max(1, int(0.05 * len(sme_labels))), replace=False))
    df.loc[df["sme_id"].isin(flip_ids), "distressed_within_6_months"] = (
        1 - df.loc[df["sme_id"].isin(flip_ids), "distressed_within_6_months"]
    )
    return df


def _curve_points(xs, ys, max_points: int = 80):
    n = len(xs)
    idx = np.arange(n) if n <= max_points else np.linspace(0, n - 1, max_points).astype(int)
    return [{"x": float(xs[i]), "y": float(ys[i])} for i in idx]


def evaluate_binary(y_true, y_prob, y_pred, feature_names, importances) -> dict:
    fpr, tpr, _ = roc_curve(y_true, y_prob)
    precision_c, recall_c, _ = precision_recall_curve(y_true, y_prob)
    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1": float(f1_score(y_true, y_pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_true, y_prob)),
        "pr_auc": float(average_precision_score(y_true, y_prob)),
        "confusion_matrix": confusion_matrix(y_true, y_pred).tolist(),
        "roc_curve": _curve_points(fpr, tpr),
        "pr_curve": _curve_points(recall_c, precision_c),
        "feature_importances": [
            {"feature": f, "importance": float(v)}
            for f, v in sorted(zip(feature_names, importances), key=lambda x: abs(x[1]), reverse=True)
        ],
    }


def train_and_export() -> dict:
    print("=" * 60)
    print("SME Pulse - generating panel and training models")
    print("=" * 60)

    panel = generate_synthetic_panel()
    DATASET_CSV.parent.mkdir(parents=True, exist_ok=True)
    panel.to_csv(DATASET_CSV, index=False)

    # Train on month-12 snapshot per SME (account-level early-warning eval)
    snap = panel[panel["month"] == N_MONTHS].copy()
    print(f"Panel: {len(panel)} rows ({N_SMES} SMEs x {N_MONTHS} months)")
    print(f"Snapshot train set: {len(snap)} | distress rate: {snap['distressed_within_6_months'].mean():.3%}")
    print(f"Saved CSV -> {DATASET_CSV}")

    X = snap[FEATURE_COLS].values
    y = snap["distressed_within_6_months"].values
    sme_ids = snap["sme_id"].values

    X_train, X_test, y_train, y_test, id_train, id_test = train_test_split(
        X, y, sme_ids, test_size=0.25, random_state=RANDOM_STATE, stratify=y
    )

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    lr = LogisticRegression(
        class_weight="balanced",
        max_iter=2000,
        random_state=RANDOM_STATE,
    )
    lr.fit(X_train_s, y_train)
    lr_prob = lr.predict_proba(X_test_s)[:, 1]
    lr_pred = (lr_prob >= 0.5).astype(int)
    lr_metrics = evaluate_binary(y_test, lr_prob, lr_pred, FEATURE_COLS, lr.coef_[0])

    rf = RandomForestClassifier(
        n_estimators=250,
        max_depth=8,
        min_samples_leaf=3,
        class_weight="balanced_subsample",
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )
    rf.fit(X_train, y_train)
    rf_prob = rf.predict_proba(X_test)[:, 1]
    rf_pred = (rf_prob >= 0.5).astype(int)
    rf_metrics = evaluate_binary(y_test, rf_prob, rf_pred, FEATURE_COLS, rf.feature_importances_)

    distressed_smes = snap[snap["distressed_within_6_months"] == 1]["sme_id"].tolist()
    healthy_smes = snap[snap["distressed_within_6_months"] == 0]["sme_id"].tolist()
    rng = np.random.default_rng(RANDOM_STATE)
    example_ids = list(rng.choice(distressed_smes, 3, replace=False)) + list(
        rng.choice(healthy_smes, 2, replace=False)
    )

    trajectories = []
    for sid in example_ids:
        sme_rows = panel[panel["sme_id"] == sid].sort_values("month")
        true_label = int(sme_rows["distressed_within_6_months"].iloc[0])
        months_data = []
        crossed_month = None
        for _, r in sme_rows.iterrows():
            feats = r[FEATURE_COLS].values.astype(float).reshape(1, -1)
            feats_s = scaler.transform(feats)
            score = float(lr.predict_proba(feats_s)[0, 1] * 100)
            rf_score = float(rf.predict_proba(feats)[0, 1] * 100)
            if crossed_month is None and score >= 60:
                crossed_month = int(r["month"])
            months_data.append(
                {
                    "month": int(r["month"]),
                    "distress_score_lr": round(score, 2),
                    "distress_score_rf": round(rf_score, 2),
                    "monthly_inflow": float(r["monthly_inflow"]),
                    "monthly_outflow": float(r["monthly_outflow"]),
                    "cash_runway_months": float(r["cash_runway_months"]),
                    "overdraft_days_used": int(r["overdraft_days_used"]),
                }
            )
        trajectories.append(
            {
                "sme_id": str(sid),
                "true_distressed": true_label,
                "high_risk_threshold": 60,
                "crossed_high_risk_month": crossed_month,
                "months": months_data,
            }
        )

    artifact = {
        "meta": {
            "task": "sme_pulse",
            "n_smes": N_SMES,
            "n_months": N_MONTHS,
            "n_panel_rows": int(len(panel)),
            "n_train_accounts": int(len(X_train)),
            "distress_rate": float(snap["distressed_within_6_months"].mean()),
            "train_test_split": 0.75,
            "test_size": 0.25,
            "training_row": "month-12 snapshot per SME (account-level label)",
            "feature_names": FEATURE_COLS,
            "class_imbalance_handling": {
                "logistic_regression": "class_weight='balanced'",
                "random_forest": "class_weight='balanced_subsample'",
            },
            "why_models": (
                "Logistic Regression for audit-ready coefficient explanations to credit "
                "committees. Random Forest for non-linear interaction capture and stronger "
                "early-warning discrimination on deteriorating cash-flow patterns."
            ),
        },
        "logistic_regression": {
            **lr_metrics,
            "coefficients": {f: float(c) for f, c in zip(FEATURE_COLS, lr.coef_[0])},
            "intercept": float(lr.intercept_[0]),
            "scaler_mean": {f: float(m) for f, m in zip(FEATURE_COLS, scaler.mean_)},
            "scaler_scale": {f: float(s) for f, s in zip(FEATURE_COLS, scaler.scale_)},
        },
        "random_forest": rf_metrics,
        "trajectories": trajectories,
        "high_risk_threshold": 60,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(artifact, f, indent=2)

    print(f"LR  ROC-AUC={lr_metrics['roc_auc']:.4f}  PR-AUC={lr_metrics['pr_auc']:.4f}")
    print(f"RF  ROC-AUC={rf_metrics['roc_auc']:.4f}  PR-AUC={rf_metrics['pr_auc']:.4f}")
    print(f"Trajectories: {[t['sme_id'] for t in trajectories]}")
    print(f"Exported -> {OUTPUT_PATH}")
    return artifact


if __name__ == "__main__":
    train_and_export()
