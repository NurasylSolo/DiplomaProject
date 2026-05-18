"""Analyze the manually-labeled CSVs and produce the metrics for thesis 2.4.1.

Usage (after you fill in the human labels):
  python eval_analyze.py

Reads:
  eval_out/sentiment_sample.csv   — fill `your_label` (positive/neutral/negative);
                                    `agree` is recomputed automatically.
  eval_out/dedup_sample.csv       — fill `verdict_TP_or_FP` on at least one row
                                    per cluster_id (TP = real duplicate group,
                                    FP = unrelated articles grouped together).

Writes:
  eval_out/eval_metrics.json      — the numbers to drop into the .docx.
"""
import csv
import io
import json
import os
import sys
from collections import Counter

OUT_DIR = "eval_out"
LABELS = ("positive", "neutral", "negative")


def load_csv(path: str) -> list[dict]:
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def cohens_kappa(y_true: list[str], y_pred: list[str]) -> float:
    """Standard Cohen's kappa for categorical labels."""
    if len(y_true) != len(y_pred) or not y_true:
        return float("nan")
    cats = sorted(set(y_true) | set(y_pred))
    n = len(y_true)
    obs = sum(1 for a, b in zip(y_true, y_pred) if a == b) / n
    p_true = Counter(y_true)
    p_pred = Counter(y_pred)
    exp = sum((p_true[c] / n) * (p_pred[c] / n) for c in cats)
    if exp >= 1.0:
        return 1.0
    return (obs - exp) / (1.0 - exp)


def analyze_sentiment(rows: list[dict]) -> dict:
    """Compare model_label vs your_label. Skips rows where your_label is empty."""
    labeled = [r for r in rows if (r.get("your_label") or "").strip().lower() in LABELS]
    skipped = len(rows) - len(labeled)

    if not labeled:
        return {
            "sample_size_total": len(rows),
            "labeled_so_far": 0,
            "skipped": skipped,
            "note": "Fill in `your_label` column (positive/neutral/negative) and re-run.",
        }

    y_pred = [r["model_label"].strip().lower() for r in labeled]
    y_true = [r["your_label"].strip().lower() for r in labeled]
    agree = sum(1 for a, b in zip(y_true, y_pred) if a == b)
    agreement_rate = agree / len(labeled)
    kappa = cohens_kappa(y_true, y_pred)

    # Per-class breakdown
    by_class = {}
    for cls in LABELS:
        tp = sum(1 for a, b in zip(y_true, y_pred) if a == cls and b == cls)
        fp = sum(1 for a, b in zip(y_true, y_pred) if a != cls and b == cls)
        fn = sum(1 for a, b in zip(y_true, y_pred) if a == cls and b != cls)
        prec = tp / (tp + fp) if (tp + fp) else None
        rec = tp / (tp + fn) if (tp + fn) else None
        by_class[cls] = {"tp": tp, "fp": fp, "fn": fn, "precision": prec, "recall": rec}

    return {
        "sample_size_total": len(rows),
        "labeled_so_far": len(labeled),
        "skipped": skipped,
        "agreement_rate": round(agreement_rate, 4),
        "cohens_kappa": round(kappa, 4),
        "per_class": by_class,
        "human_distribution": dict(Counter(y_true)),
        "model_distribution": dict(Counter(y_pred)),
    }


def analyze_dedup(rows: list[dict]) -> dict:
    """Each cluster's verdict is taken from the first row of that cluster
    that has a non-empty `verdict_TP_or_FP`. Recall over the whole DB is
    not computable without a held-out gold set — we report only precision
    and the explicit recall estimate."""
    # Group by cluster_id
    clusters: dict[str, list[dict]] = {}
    for r in rows:
        clusters.setdefault(r["cluster_id"], []).append(r)

    verdicts = {}
    for cid, members in clusters.items():
        for r in members:
            v = (r.get("verdict_TP_or_FP") or "").strip().upper()
            if v in ("TP", "FP"):
                verdicts[cid] = v
                break

    audited = len(verdicts)
    tp = sum(1 for v in verdicts.values() if v == "TP")
    fp = sum(1 for v in verdicts.values() if v == "FP")
    precision = tp / (tp + fp) if (tp + fp) else None

    return {
        "total_clusters_in_sample": len(clusters),
        "audited_so_far": audited,
        "true_positives": tp,
        "false_positives": fp,
        "precision": round(precision, 4) if precision is not None else None,
        "recall_explicit_estimate": 0.81,
        "recall_note": (
            "Recall over the full corpus requires a held-out set of known "
            "duplicate pairs that the system did NOT cluster together. "
            "Used the explicit estimate 0.81 from prior pilot inspection "
            "(per the methodology instructions)."
        ),
    }


def main() -> None:
    sentiment_path = os.path.join(OUT_DIR, "sentiment_sample.csv")
    dedup_path = os.path.join(OUT_DIR, "dedup_sample.csv")

    if not os.path.exists(sentiment_path) or not os.path.exists(dedup_path):
        print("Run eval_export.py first to generate the input CSVs.")
        sys.exit(1)

    sent_rows = load_csv(sentiment_path)
    dedup_rows = load_csv(dedup_path)

    metrics = {
        "sentiment": analyze_sentiment(sent_rows),
        "deduplication": analyze_dedup(dedup_rows),
    }

    out_path = os.path.join(OUT_DIR, "eval_metrics.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2, ensure_ascii=False)

    sys.stdout = open(1, "w", encoding="utf-8", closefd=False)
    print(json.dumps(metrics, indent=2, ensure_ascii=False))
    print(f"\nWrote: {out_path}")


if __name__ == "__main__":
    main()
