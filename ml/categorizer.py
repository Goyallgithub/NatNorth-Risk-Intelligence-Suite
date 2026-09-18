"""
Smart Categorizer - Merchant Description Classification
=======================================================
Generates noisy synthetic merchant description strings mapped to 10 banking
categories, trains TF-IDF + Logistic Regression and TF-IDF + Random Forest,
evaluates per-category and overall metrics, and exports JSON for the frontend.

Why these models?
- TF-IDF + Logistic Regression: strong, fast baseline for short text; coefficients
  on n-grams are interpretable ("TESCO" -> Groceries). Good for explaining to
  non-ML stakeholders why a description landed in a category.
- TF-IDF + Random Forest: captures non-linear token interactions and is more
  robust to noisy / overlapping strings (e.g. "AMAZON PRIME" vs "AMAZON.CO.UK").
"""

from __future__ import annotations

import json
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_recall_fscore_support,
)
from sklearn.model_selection import train_test_split

warnings.filterwarnings("ignore")

RANDOM_STATE = 42
N_SAMPLES = 4000
OUTPUT_PATH = Path(__file__).resolve().parent.parent / "public" / "data" / "categorizer.json"
DATASET_CSV = Path(__file__).resolve().parent.parent / "public" / "datasets" / "categorizer_dataset.csv"

CATEGORIES = [
    "Groceries",
    "Transport",
    "Dining",
    "Utilities",
    "Entertainment",
    "Shopping",
    "Rent/Mortgage",
    "Salary/Income",
    "Transfers",
    "Subscriptions",
]

TEMPLATES: dict[str, list[str]] = {
    "Groceries": [
        "TESCO STORES {n} {city}",
        "SAINSBURYS S/MKTS {city}",
        "ASDA SUPERSTORE {n}",
        "WAITROSE {city}",
        "LIDL GB {city}",
        "ALDI STORES {n}",
        "CO-OP FOOD {city}",
        "MARKS&SPENCER FOOD {city}",
        "MORRISONS {city} {n}",
        "OCADO LTD REF {n}",
    ],
    "Transport": [
        "UBER *TRIP HELP.UBER.COM",
        "TFL TRAVEL CHARGE {n}",
        "TRAINLINE.COM TICKET",
        "SHELL PETROL {city}",
        "BP {city} FUEL",
        "NATIONAL EXPRESS {city}",
        "STAGECOACH BUS {n}",
        "BOLT.EU/TRIP {n}",
        "PARKINGEYE LTD {city}",
        "DVLA TAX {n}",
        "FIRST BUS {city}",
    ],
    "Dining": [
        "PRET A MANGER {city}",
        "COSTA COFFEE {n}",
        "MCDONALDS {city}",
        "NANDOS {city}",
        "DELIVEROO.CO.UK {n}",
        "JUST EAT {city}",
        "STARBUCKS {city}",
        "GREGGS PLC {n}",
        "WAGAMAMA {city}",
        "UBER *EATS HELP.UBER.COM",
        "DOMINOS PIZZA {city}",
    ],
    "Utilities": [
        "BRITISH GAS ENERGY",
        "OCTOPUS ENERGY LTD",
        "THAMES WATER {n}",
        "EE LIMITED MOBILE",
        "VODAFONE LTD",
        "BT GROUP PLC",
        "VIRGIN MEDIA O2",
        "SCOTTISH POWER",
        "EDF ENERGY",
        "COUNCIL TAX {city}",
    ],
    "Entertainment": [
        "CINEWORLD {city}",
        "ODEON CINEMAS {n}",
        "STEAMGAMES.COM {n}",
        "PLAYSTATION NETWORK",
        "TICKETMASTER UK",
        "EVENTBRITE *EVENT",
        "PURE GYM {city}",
        "THE GYM GROUP {n}",
    ],
    "Shopping": [
        "AMAZON.CO.UK *{n}",
        "AMZN MKTP UK",
        "ARGOS LTD {city}",
        "JOHN LEWIS {city}",
        "IKEA LTD {city}",
        "PRIMARK {city}",
        "ZARA.COM UK",
        "NEXT RETAIL LTD",
        "EBAY O *{n}",
        "APPLE.COM/BILL",
        "CURRYS PC WORLD",
    ],
    "Rent/Mortgage": [
        "NATNORTH MORTGAGE {n}",
        "HALIFAX MORTGAGE PYMT",
        "LANDLORD RENT {city}",
        "RIGHTMOVE RENT REF {n}",
        "PROPERTY MGMT LTD RENT",
        "SANTANDER MORTGAGE",
        "RENT PAYMENT {name}",
        "HOMELET RENT GUARANTEE",
    ],
    "Salary/Income": [
        "SALARY {company} BACS",
        "PAYROLL {company}",
        "HMRC TAX CREDIT",
        "FASTER PAYMENT FROM {company} SALARY",
        "PENSION PAYMENT {company}",
        "DWP UNIVERSAL CREDIT",
        "EMPLOYER BACS {company}",
    ],
    "Transfers": [
        "FP TO {name} REF {n}",
        "TRANSFER TO {name}",
        "FASTER PAYMENTS OUT {name}",
        "STANDING ORDER TO {name}",
        "BANK TRANSFER {name}",
        "P2P PAYMENT {name}",
        "REVOLUT TRANSFER {n}",
    ],
    "Subscriptions": [
        "NETFLIX.COM",
        "SPOTIFY P{n}",
        "DISNEY PLUS",
        "AMAZON PRIME {n}",
        "APPLE.COM/BILL ICLOUD",
        "MICROSOFT*XBOX",
        "ADOBE SYSTEMS",
        "GITHUB INC",
        "NYTIMES DIGITAL",
        "THE GUARDIAN DIGITAL",
        "DROPBOX*IB",
    ],
}

CITIES = ["LONDON", "MANCHESTER", "BIRMINGHAM", "LEEDS", "GLASGOW", "BRISTOL", "EDINBURGH", "LIVERPOOL"]
NAMES = ["J SMITH", "A PATEL", "M KHAN", "S BROWN", "R SINGH", "L JONES", "C TAYLOR"]
COMPANIES = ["ACME LTD", "NORTHSTAR PLC", "BLUEWAVE LTD", "PIVOT IO", "HELIOS CORP"]


def _noise(s: str, rng: np.random.Generator) -> str:
    """Apply realistic bank-feed noise: truncation, extra spaces, digits, casing."""
    if rng.random() < 0.22:
        s = s[: int(rng.integers(10, max(11, len(s))))]
    if rng.random() < 0.25:
        s = s + f" REF{rng.integers(1000, 99999)}"
    if rng.random() < 0.12:
        s = "  ".join(s.split())
    if rng.random() < 0.1:
        s = s.lower()
    elif rng.random() < 0.3:
        s = s.title()
    # Occasional OCR / feed corruption
    if rng.random() < 0.08 and len(s) > 6:
        i = int(rng.integers(0, len(s) - 1))
        s = s[:i] + rng.choice(list("X#*")) + s[i + 1 :]
    return s.strip()


def generate_synthetic_data(n: int = N_SAMPLES, seed: int = RANDOM_STATE) -> pd.DataFrame:
    """
    Generate messy merchant description strings with known category labels.

    Each category draws from templated UK-style merchant strings, fills placeholders
    with city/name/company/number tokens, then applies bank-feed noise so the
    classifier must generalise beyond exact string match.
    """
    rng = np.random.default_rng(seed)
    rows = []
    weights = np.array([0.14, 0.10, 0.11, 0.09, 0.08, 0.14, 0.07, 0.06, 0.11, 0.10])
    weights = weights / weights.sum()

    for _ in range(n):
        cat = rng.choice(CATEGORIES, p=weights)
        template = rng.choice(TEMPLATES[cat])
        text = template.format(
            n=int(rng.integers(10, 9999)),
            city=rng.choice(CITIES),
            name=rng.choice(NAMES),
            company=rng.choice(COMPANIES),
        )
        text = _noise(text, rng)
        rows.append({"description": text, "category": cat})

    return pd.DataFrame(rows)


def train_and_export() -> dict:
    print("=" * 60)
    print("Smart Categorizer - generating data and training models")
    print("=" * 60)

    df = generate_synthetic_data()
    DATASET_CSV.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(DATASET_CSV, index=False)
    print(f"Dataset: {len(df)} rows | categories: {len(CATEGORIES)}")
    print(f"Saved CSV -> {DATASET_CSV}")

    X = df["description"].values
    y = df["category"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=RANDOM_STATE, stratify=y
    )

    vectorizer = TfidfVectorizer(
        analyzer="word",
        ngram_range=(1, 2),
        min_df=2,
        max_features=4000,
        sublinear_tf=True,
    )
    X_train_tf = vectorizer.fit_transform(X_train)
    X_test_tf = vectorizer.transform(X_test)

    # sklearn 1.9+: multinomial is default for multiclass; no multi_class kwarg
    lr = LogisticRegression(
        max_iter=2000,
        solver="lbfgs",
        C=2.0,
        random_state=RANDOM_STATE,
    )
    lr.fit(X_train_tf, y_train)
    lr_pred = lr.predict(X_test_tf)
    lr_proba = lr.predict_proba(X_test_tf)

    rf = RandomForestClassifier(
        n_estimators=200,
        max_depth=28,
        min_samples_leaf=2,
        class_weight="balanced_subsample",
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )
    rf.fit(X_train_tf, y_train)
    rf_pred = rf.predict(X_test_tf)
    rf_proba = rf.predict_proba(X_test_tf)

    def pack_metrics(y_true, y_pred, model_name: str) -> dict:
        prec, rec, f1, support = precision_recall_fscore_support(
            y_true, y_pred, labels=CATEGORIES, zero_division=0
        )
        cm = confusion_matrix(y_true, y_pred, labels=CATEGORIES).tolist()
        per_cat = [
            {
                "category": c,
                "precision": float(prec[i]),
                "recall": float(rec[i]),
                "f1": float(f1[i]),
                "support": int(support[i]),
            }
            for i, c in enumerate(CATEGORIES)
        ]
        return {
            "model": model_name,
            "accuracy": float(accuracy_score(y_true, y_pred)),
            "macro_f1": float(f1_score(y_true, y_pred, average="macro")),
            "weighted_f1": float(f1_score(y_true, y_pred, average="weighted")),
            "per_category": per_cat,
            "confusion_matrix": cm,
            "confusion_matrix_labels": CATEGORIES,
        }

    lr_metrics = pack_metrics(y_test, lr_pred, "TF-IDF + Logistic Regression")
    rf_metrics = pack_metrics(y_test, rf_pred, "TF-IDF + Random Forest")

    feature_names = vectorizer.get_feature_names_out()
    coef_abs_mean = np.mean(np.abs(lr.coef_), axis=0)
    top_idx = np.argsort(coef_abs_mean)[::-1][:120]
    vocabulary_weights = []
    for i in top_idx:
        class_weights = {cat: float(lr.coef_[c_i, i]) for c_i, cat in enumerate(lr.classes_)}
        vocabulary_weights.append(
            {
                "token": str(feature_names[i]),
                "mean_abs_coef": float(coef_abs_mean[i]),
                "class_coefficients": class_weights,
            }
        )

    keyword_rules = {
        "Groceries": ["tesco", "sainsbury", "asda", "waitrose", "lidl", "aldi", "co-op", "morrison", "ocado", "marks"],
        "Transport": ["uber *trip", "tfl", "trainline", "shell", "petrol", "fuel", "bolt", "parking", "dvla", "bus", "national express"],
        "Dining": ["pret", "costa", "mcdonald", "nando", "deliveroo", "just eat", "starbucks", "greggs", "wagamama", "uber *eats", "domino"],
        "Utilities": ["british gas", "octopus", "thames water", "vodafone", "virgin media", "scottish power", "edf", "council tax", "ee limited", "bt group"],
        "Entertainment": ["cineworld", "odeon", "steam", "playstation", "ticketmaster", "eventbrite", "pure gym", "the gym"],
        "Shopping": ["amazon.co.uk", "amzn", "argos", "john lewis", "ikea", "primark", "zara", "next retail", "ebay", "currys"],
        "Rent/Mortgage": ["mortgage", "landlord", "rent", "property mgmt", "homelet"],
        "Salary/Income": ["salary", "payroll", "hmrc", "pension", "universal credit", "employer bacs"],
        "Transfers": ["fp to", "transfer to", "faster payment", "standing order", "bank transfer", "p2p", "revolut transfer"],
        "Subscriptions": ["netflix", "spotify", "disney", "amazon prime", "icloud", "xbox", "adobe", "github", "dropbox", "guardian digital", "nytimes"],
    }

    rng = np.random.default_rng(RANDOM_STATE)
    sample_idx = rng.choice(len(X_test), size=15, replace=False)
    samples = []
    for i in sample_idx:
        samples.append(
            {
                "description": str(X_test[i]),
                "true_category": str(y_test[i]),
                "lr_predicted": str(lr_pred[i]),
                "lr_confidence": float(np.max(lr_proba[i])),
                "rf_predicted": str(rf_pred[i]),
                "rf_confidence": float(np.max(rf_proba[i])),
            }
        )

    class_priors = {c: float(np.mean(y_train == c)) for c in CATEGORIES}

    artifact = {
        "meta": {
            "task": "categorizer",
            "n_samples": int(len(df)),
            "n_categories": len(CATEGORIES),
            "categories": CATEGORIES,
            "train_test_split": 0.75,
            "test_size": 0.25,
            "vectorizer": "TfidfVectorizer(word, ngram 1-2, max_features=4000)",
            "why_models": (
                "TF-IDF + Logistic Regression gives interpretable n-gram coefficients for "
                "category decisions. Random Forest improves robustness on noisy overlapping "
                "merchant strings where linear separators struggle."
            ),
        },
        "logistic_regression": lr_metrics,
        "random_forest": rf_metrics,
        "keyword_rules": keyword_rules,
        "vocabulary_weights": vocabulary_weights,
        "class_priors": class_priors,
        "lr_intercept": {cat: float(v) for cat, v in zip(lr.classes_, lr.intercept_)},
        "samples": samples,
        "per_category_f1_comparison": [
            {
                "category": c,
                "lr_f1": next(p["f1"] for p in lr_metrics["per_category"] if p["category"] == c),
                "rf_f1": next(p["f1"] for p in rf_metrics["per_category"] if p["category"] == c),
            }
            for c in CATEGORIES
        ],
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(artifact, f, indent=2)

    print(f"LR  Acc={lr_metrics['accuracy']:.4f}  Macro-F1={lr_metrics['macro_f1']:.4f}")
    print(f"RF  Acc={rf_metrics['accuracy']:.4f}  Macro-F1={rf_metrics['macro_f1']:.4f}")
    print(f"Exported -> {OUTPUT_PATH}")
    return artifact


if __name__ == "__main__":
    train_and_export()
