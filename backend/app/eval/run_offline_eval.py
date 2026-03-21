from __future__ import annotations

import json
from pathlib import Path
import sys

if __package__ in {None, ""}:
    sys.path.append(str(Path(__file__).resolve().parents[2]))

from app.services.nlp_pipeline.classifiers import detect_sentiment_multilingual


def _f1_like(tp: int, fp: int, fn: int) -> float:
    if tp == 0:
        return 0.0
    p = tp / max(1, tp + fp)
    r = tp / max(1, tp + fn)
    if p + r == 0:
        return 0.0
    return 2 * p * r / (p + r)


def run(dataset_path: str = "app/eval/gold_dataset_sample.json") -> dict:
    rows = json.loads(Path(dataset_path).read_text(encoding="utf-8"))
    labels = ["positive", "neutral", "negative"]
    stats = {l: {"tp": 0, "fp": 0, "fn": 0} for l in labels}

    for row in rows:
        pred, _ = detect_sentiment_multilingual(row["text"])
        true = row["sentiment"]
        for label in labels:
            if pred == label and true == label:
                stats[label]["tp"] += 1
            elif pred == label and true != label:
                stats[label]["fp"] += 1
            elif pred != label and true == label:
                stats[label]["fn"] += 1

    metrics = {}
    for label in labels:
        tp = stats[label]["tp"]
        fp = stats[label]["fp"]
        fn = stats[label]["fn"]
        precision = tp / max(1, tp + fp)
        recall = tp / max(1, tp + fn)
        f1 = _f1_like(tp, fp, fn)
        metrics[label] = {
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1": round(f1, 4),
        }
    return {"sentiment_metrics": metrics, "samples": len(rows)}


if __name__ == "__main__":
    result = run()
    print(json.dumps(result, ensure_ascii=False, indent=2))

