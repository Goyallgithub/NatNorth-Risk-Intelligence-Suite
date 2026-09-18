"""
Payment Shield - APP Fraud Detection Model Training
====================================================
Generates a realistic synthetic Authorised Push Payment (APP) fraud dataset,
trains Logistic Regression (interpretable baseline) and XGBoost (stronger model),
evaluates with a full metric suite suitable for imbalanced fraud detection,
and exports a static JSON artifact for the NatNorth frontend.

Why these models?
- Logistic Regression: banking fraud decisions need coefficient-level explainability
  for regulatory review (FCA / PSR reimbursement rules context). Coefficients map
  directly to feature contributions -- interview-friendly and audit-ready.
- XGBoost: captures non-linear interactions (e.g. new payee x night-time x high z-score)
  that LR cannot. Used as the production-quality performance ceiling.

Class imbalance (~3-4% fraud): handled via class_weight='balanced' for LR and
scale_pos_weight = n_neg/n_pos for XGBoost so the minority class is not ignored.
"""

from __future__ import annotations

import json
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
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
from xgboost import XGBClassifier

warnings.filterwarnings("ignore")

RANDOM_STATE = 42
N_SAMPLES = 5000
FRAUD_RATE = 0.035
OUTPUT_PATH = Path(__file__).resolve().parent.parent / "public" / "data" / "payment_shield.json"
DATASET_CSV = Path(__file__).resolve().parent.parent / "public" / "datasets" / "payment_shield_dataset.csv"

FEATURE_COLS = [
    "transaction_amount",
    "recipient_is_new_payee",
    "hours_since_last_login",
    "time_of_day",
    "is_first_payment_to_recipient",
    "deviation_from_avg_transaction_zscore",
    "num_payments_today",
    "account_age_days",
    "is_international",
]


def generate_synthetic_data(n: int = N_SAMPLES, fraud_rate: float = FRAUD_RATE, seed: int = RANDOM_STATE) -> pd.DataFrame:
    """
    Generate a realistic APP-fraud-like transaction dataset.

    Strategy: draw a latent fraud flag at the target rate, then sample features
    from class-conditional distributions with intentional overlap so models achieve
    strong but not perfect discrimination (typically ROC-AUC ~0.88-0.94).
    """
    rng = np.random.default_rng(seed)
    is_fraud = (rng.random(n) < fraud_rate).astype(int)
    fraud = is_fraud == 1
    legit = ~fraud
    n_f, n_l = int(fraud.sum()), int(legit.sum())

    transaction_amount = np.empty(n)
    recipient_is_new_payee = np.empty(n, dtype=int)
    hours_since_last_login = np.empty(n)
    time_of_day = np.empty(n, dtype=int)
    is_first_payment_to_recipient = np.empty(n, dtype=int)
    deviation_from_avg_transaction_zscore = np.empty(n)
    num_payments_today = np.empty(n, dtype=int)
    account_age_days = np.empty(n)
    is_international = np.empty(n, dtype=int)

    # --- Fraud class-conditional draws ---
    transaction_amount[fraud] = rng.lognormal(mean=6.2, sigma=0.8, size=n_f)
    recipient_is_new_payee[fraud] = rng.binomial(1, 0.85, size=n_f)
    hours_since_last_login[fraud] = rng.exponential(scale=2.0, size=n_f)
    night = rng.random(n_f) < 0.72
    time_of_day[fraud] = np.where(
        night,
        rng.choice([0, 1, 2, 3, 4, 5, 22, 23], size=n_f),
        rng.integers(0, 24, size=n_f),
    )
    is_first_payment_to_recipient[fraud] = rng.binomial(1, 0.80, size=n_f)
    deviation_from_avg_transaction_zscore[fraud] = rng.normal(2.6, 0.75, size=n_f)
    num_payments_today[fraud] = rng.poisson(lam=4.8, size=n_f)
    account_age_days[fraud] = rng.gamma(shape=1.6, scale=80, size=n_f)
    is_international[fraud] = rng.binomial(1, 0.40, size=n_f)

    # --- Legitimate class-conditional draws ---
    transaction_amount[legit] = rng.lognormal(mean=4.2, sigma=0.85, size=n_l)
    recipient_is_new_payee[legit] = rng.binomial(1, 0.10, size=n_l)
    hours_since_last_login[legit] = rng.exponential(scale=18, size=n_l)
    day = rng.random(n_l) < 0.8
    time_of_day[legit] = np.where(
        day,
        rng.integers(8, 20, size=n_l),
        rng.integers(0, 24, size=n_l),
    )
    is_first_payment_to_recipient[legit] = rng.binomial(1, 0.06, size=n_l)
    deviation_from_avg_transaction_zscore[legit] = rng.normal(0.0, 0.8, size=n_l)
    num_payments_today[legit] = rng.poisson(lam=1.0, size=n_l)
    account_age_days[legit] = rng.gamma(shape=4.8, scale=210, size=n_l)
    is_international[legit] = rng.binomial(1, 0.04, size=n_l)

    transaction_amount = np.clip(transaction_amount, 5, 25000)
    hours_since_last_login = np.clip(hours_since_last_login, 0.05, 720)
    num_payments_today = np.clip(num_payments_today, 0, 25).astype(int)
    account_age_days = np.clip(account_age_days, 3, 5000)

    # ~1% label noise
    flip = rng.random(n) < 0.01
    is_fraud = np.where(flip, 1 - is_fraud, is_fraud)

    return pd.DataFrame(
        {
            "transaction_amount": np.round(transaction_amount, 2),
            "recipient_is_new_payee": recipient_is_new_payee.astype(int),
            "hours_since_last_login": np.round(hours_since_last_login, 2),
            "time_of_day": time_of_day.astype(int),
            "is_first_payment_to_recipient": is_first_payment_to_recipient.astype(int),
            "deviation_from_avg_transaction_zscore": np.round(deviation_from_avg_transaction_zscore, 3),
            "num_payments_today": num_payments_today.astype(int),
            "account_age_days": np.round(account_age_days, 1),
            "is_international": is_international.astype(int),
            "is_fraud": is_fraud.astype(int),
        }
    )


def _curve_points(fpr_or_rec, tpr_or_prec, max_points: int = 80):
    n = len(fpr_or_rec)
    idx = np.arange(n) if n <= max_points else np.linspace(0, n - 1, max_points).astype(int)
    return [{"x": float(fpr_or_rec[i]), "y": float(tpr_or_prec[i])} for i in idx]


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
    print("Payment Shield - generating data and training models")
    print("=" * 60)

    df = generate_synthetic_data()
    DATASET_CSV.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(DATASET_CSV, index=False)
    print(f"Dataset: {len(df)} rows | fraud rate: {df['is_fraud'].mean():.3%}")
    print(f"Saved CSV -> {DATASET_CSV}")

    X = df[FEATURE_COLS].values
    y = df["is_fraud"].values

    X_train, X_test, y_train, y_test, idx_train, idx_test = train_test_split(
        X, y, df.index.values, test_size=0.25, random_state=RANDOM_STATE, stratify=y
    )

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    lr = LogisticRegression(
        class_weight="balanced",
        max_iter=2000,
        random_state=RANDOM_STATE,
        solver="lbfgs",
    )
    lr.fit(X_train_s, y_train)
    lr_prob = lr.predict_proba(X_test_s)[:, 1]
    lr_pred = (lr_prob >= 0.5).astype(int)
    lr_metrics = evaluate_binary(y_test, lr_prob, lr_pred, FEATURE_COLS, lr.coef_[0])

    n_pos = max(int(y_train.sum()), 1)
    n_neg = len(y_train) - n_pos
    scale_pos_weight = n_neg / n_pos

    xgb = XGBClassifier(
        n_estimators=220,
        max_depth=5,
        learning_rate=0.07,
        subsample=0.9,
        colsample_bytree=0.9,
        min_child_weight=2,
        scale_pos_weight=scale_pos_weight,
        eval_metric="aucpr",
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )
    xgb.fit(X_train, y_train)
    xgb_prob = xgb.predict_proba(X_test)[:, 1]
    xgb_pred = (xgb_prob >= 0.5).astype(int)
    xgb_metrics = evaluate_binary(
        y_test, xgb_prob, xgb_pred, FEATURE_COLS, xgb.feature_importances_
    )

    fraud_test = np.where(y_test == 1)[0]
    legit_test = np.where(y_test == 0)[0]
    rng = np.random.default_rng(RANDOM_STATE)
    n_fraud_sample = min(8, len(fraud_test))
    n_legit_sample = 20 - n_fraud_sample
    sample_idx = np.concatenate(
        [
            rng.choice(fraud_test, n_fraud_sample, replace=False),
            rng.choice(legit_test, n_legit_sample, replace=False),
        ]
    )
    rng.shuffle(sample_idx)

    samples = []
    for i in sample_idx:
        row = df.loc[idx_test[i]]
        samples.append(
            {
                "transaction_amount": float(row["transaction_amount"]),
                "recipient_is_new_payee": int(row["recipient_is_new_payee"]),
                "hours_since_last_login": float(row["hours_since_last_login"]),
                "time_of_day": int(row["time_of_day"]),
                "is_first_payment_to_recipient": int(row["is_first_payment_to_recipient"]),
                "deviation_from_avg_transaction_zscore": float(row["deviation_from_avg_transaction_zscore"]),
                "num_payments_today": int(row["num_payments_today"]),
                "account_age_days": float(row["account_age_days"]),
                "is_international": int(row["is_international"]),
                "true_label": int(row["is_fraud"]),
                "lr_probability": float(lr_prob[i]),
                "xgb_probability": float(xgb_prob[i]),
            }
        )

    artifact = {
        "meta": {
            "task": "payment_shield",
            "n_samples": int(len(df)),
            "n_features": len(FEATURE_COLS),
            "fraud_rate": float(df["is_fraud"].mean()),
            "train_test_split": 0.75,
            "test_size": 0.25,
            "class_imbalance_handling": {
                "logistic_regression": "class_weight='balanced'",
                "xgboost": f"scale_pos_weight={scale_pos_weight:.2f} (n_neg/n_pos)",
            },
            "feature_names": FEATURE_COLS,
            "why_models": (
                "Logistic Regression retained for coefficient-level explainability required in "
                "regulated fraud decisions. XGBoost retained as the high-AUC production candidate "
                "that captures non-linear feature interactions."
            ),
        },
        "logistic_regression": {
            **lr_metrics,
            "coefficients": {f: float(c) for f, c in zip(FEATURE_COLS, lr.coef_[0])},
            "intercept": float(lr.intercept_[0]),
            "scaler_mean": {f: float(m) for f, m in zip(FEATURE_COLS, scaler.mean_)},
            "scaler_scale": {f: float(s) for f, s in zip(FEATURE_COLS, scaler.scale_)},
        },
        "xgboost": xgb_metrics,
        "samples": samples,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(artifact, f, indent=2)

    print(f"LR  ROC-AUC={lr_metrics['roc_auc']:.4f}  PR-AUC={lr_metrics['pr_auc']:.4f}  F1={lr_metrics['f1']:.4f}")
    print(f"XGB ROC-AUC={xgb_metrics['roc_auc']:.4f}  PR-AUC={xgb_metrics['pr_auc']:.4f}  F1={xgb_metrics['f1']:.4f}")
    print(f"Exported -> {OUTPUT_PATH}")
    return artifact


if __name__ == "__main__":
    train_and_export()
