"""Print one row per mention with id, language, model_label, title, snippet[:300] —
so a human (or an LLM acting as second annotator) can annotate the 100 rows
without the multi-line snippets blowing up the view.
"""
import csv
import os
import sys

PATH = os.path.join("eval_out", "sentiment_sample.csv")

with open(PATH, "r", encoding="utf-8-sig", newline="") as f:
    rows = list(csv.DictReader(f))

sys.stdout = open(1, "w", encoding="utf-8", closefd=False)
for i, r in enumerate(rows, 1):
    title = (r["title"] or "").replace("\n", " ").strip()
    snippet = (r["snippet"] or "").replace("\n", " ").strip()[:300]
    print(f"\n[{i:03d}] id={r['mention_id']}  lang={r['language']}  model={r['model_label']}({r['model_score']})")
    print(f"  TITLE: {title}")
    print(f"  SNIPPET: {snippet}")

print(f"\n\nTotal rows: {len(rows)}")
