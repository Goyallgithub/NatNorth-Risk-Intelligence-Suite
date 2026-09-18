"""
Payment Shield — Credit Card Fraud (Kaggle / OpenML)
====================================================
Uses the famous ULB Credit Card Fraud Detection dataset
(Kaggle: mlg-ulb/creditcardfraud · OpenML data_id=1597):
284,807 European card transactions, ~0.172% fraud, PCA features V1–V28 + Amount.

Why this dataset?
- Industry-standard imbalanced fraud benchmark.
- Extreme class skew forces PR-AUC / recall thinking, not accuracy theatre.

Models:
- Logistic Regression (class_weight='balanced') — audit-ready coefficients
- XGBoost (scale_pos_weight) — non-linear performance ceiling

Live UI exports Amount + top-|coef| PCA features for client-side LR scoring.
"""

from __future__ import annotations

import json
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.datasets import fetch_openml
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
OPENML_ID = 1597
OUTPUT_PATH = Path(__file__).resolve().parent.parent / "public" / "data" / "payment_shield.json"
DATASET_CSV = Path(__file__).resolve().parent.parent / "public" / "datasets" / "creditcard_fraud_sample.csv"
CACHE_CSV = Path(__file__).resolve().parent / "data" / "creditcard_openml.csv"
N_LIVE_FEATURES = 8  # Amount + top PCA dims for the live scorer
SAMPLE_ROWS = 25000


def load_creditcard() -> pd.DataFrame:
    CACHE_CSV.parent.mkdir(parents=True, exist_ok=True)
    if CACHE_CSV.exists():
        print(f"Loading cached dataset → {CACHE_CSV}")
        return pd.read_csv(CACHE_CSV)

    print(f"Downloading OpenML data_id={OPENML_ID} (Kaggle ULB Credit Card Fraud)…")
    ds = fetch_openml(data_id=OPENML_ID, as_frame=True, parser="auto")
    df = ds.frame.copy()
    df["Class"] = df["Class"].astype(int)
    df.to_csv(CACHE_CSV, index=False)
    print(f"Cached → {CACHE_CSV} | shape={df.shape}")
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
    print("Payment Shield — Kaggle Credit Card Fraud (OpenML 1597)")
    print("=" * 60)

    df = load_creditcard()
    feature_cols = [c for c in df.columns if c != "Class"]
    X = df[feature_cols].values.astype(float)
    y = df["Class"].values.astype(int)

    # Stratified public sample CSV (all fraud + random legit)
    fraud_idx = np.where(y == 1)[0]
    legit_idx = np.where(y == 0)[0]
    rng = np.random.default_rng(RANDOM_STATE)
    n_legit = min(len(legit_idx), SAMPLE_ROWS - len(fraud_idx))
    sample_idx = np.concatenate(
        [fraud_idx, rng.choice(legit_idx, size=n_legit, replace=False)]
    )
    rng.shuffle(sample_idx)
    DATASET_CSV.parent.mkdir(parents=True, exist_ok=True)
    df.iloc[sample_idx].to_csv(DATASET_CSV, index=False)
    print(f"Interview sample CSV → {DATASET_CSV} ({len(sample_idx)} rows)")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=RANDOM_STATE, stratify=y
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
    lr_metrics = evaluate_binary(y_test, lr_prob, lr_pred, feature_cols, lr.coef_[0])

    n_pos = max(int(y_train.sum()), 1)
    n_neg = len(y_train) - n_pos
    scale_pos_weight = n_neg / n_pos

    xgb = XGBClassifier(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.08,
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
        y_test, xgb_prob, xgb_pred, feature_cols, xgb.feature_importances_
    )

    # Live scorer: Amount + top |LR coef| PCA features
    coef_abs = {f: abs(float(c)) for f, c in zip(feature_cols, lr.coef_[0])}
    ranked = sorted(coef_abs.keys(), key=lambda f: coef_abs[f], reverse=True)
    live_features = []
    if "Amount" in feature_cols:
        live_features.append("Amount")
    for f in ranked:
        if f not in live_features:
            live_features.append(f)
        if len(live_features) >= N_LIVE_FEATURES:
            break

    # Defaults for live UI = medians of fraud class (more interesting demo)
    fraud_df = df[df["Class"] == 1]
    live_defaults = {f: float(fraud_df[f].median()) for f in live_features}
    live_ranges = {
        f: {
            "min": float(np.percentile(df[f], 1)),
            "max": float(np.percentile(df[f], 99)),
            "step": 0.1 if f != "Amount" else 1.0,
        }
        for f in live_features
    }

    # Sample table from test set
    fraud_test = np.where(y_test == 1)[0]
    legit_test = np.where(y_test == 0)[0]
    n_fraud_sample = min(8, len(fraud_test))
    n_legit_sample = 20 - n_fraud_sample
    pick = np.concatenate(
        [
            rng.choice(fraud_test, n_fraud_sample, replace=False),
            rng.choice(legit_test, n_legit_sample, replace=False),
        ]
    )
    rng.shuffle(pick)
    samples = []
    for i in pick:
        row = {f: float(X_test[i, feature_cols.index(f)]) for f in live_features}
        row.update(
            {
                "true_label": int(y_test[i]),
                "lr_probability": float(lr_prob[i]),
                "xgb_probability": float(xgb_prob[i]),
            }
        )
        samples.append(row)

    artifact = {
        "meta": {
            "task": "payment_shield",
            "dataset": {
                "name": "Credit Card Fraud Detection",
                "kaggle": "mlg-ulb/creditcardfraud",
                "openml_id": OPENML_ID,
                "reference": "Dal Pozzolo et al. — European cardholders, PCA anonymised features",
                "n_full": int(len(df)),
                "n_features_full": len(feature_cols),
                "sample_csv": "creditcard_fraud_sample.csv",
            },
            "n_samples": int(len(df)),
            "n_features": len(feature_cols),
            "fraud_rate": float(y.mean()),
            "train_test_split": 0.75,
            "test_size": 0.25,
            "class_imbalance_handling": {
                "logistic_regression": "class_weight='balanced'",
                "xgboost": f"scale_pos_weight={scale_pos_weight:.2f} (n_neg/n_pos)",
            },
            "feature_names": feature_cols,
            "live_features": live_features,
            "live_defaults": live_defaults,
            "live_ranges": live_ranges,
            "why_models": (
                "On the Kaggle ULB credit-card fraud benchmark, Logistic Regression keeps "
                "signed coefficients for governance review of PCA-space drivers. XGBoost "
                "captures non-linear interactions and is evaluated with PR-AUC under ~0.17% fraud."
            ),
        },
        "logistic_regression": {
            **lr_metrics,
            "coefficients": {f: float(c) for f, c in zip(feature_cols, lr.coef_[0])},
            "intercept": float(lr.intercept_[0]),
            "scaler_mean": {f: float(m) for f, m in zip(feature_cols, scaler.mean_)},
            "scaler_scale": {f: float(s) for f, s in zip(feature_cols, scaler.scale_)},
        },
        "xgboost": xgb_metrics,
        "samples": samples,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(artifact, f, indent=2)

    print(f"Fraud rate={y.mean():.4%} | n={len(df)}")
    print(f"LR  ROC-AUC={lr_metrics['roc_auc']:.4f}  PR-AUC={lr_metrics['pr_auc']:.4f}  F1={lr_metrics['f1']:.4f}")
    print(f"XGB ROC-AUC={xgb_metrics['roc_auc']:.4f}  PR-AUC={xgb_metrics['pr_auc']:.4f}  F1={xgb_metrics['f1']:.4f}")
    print(f"Live features: {live_features}")
    print(f"Exported → {OUTPUT_PATH}")
    return artifact


if __name__ == "__main__":
    train_and_export()
