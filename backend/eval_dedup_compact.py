"""Compact view of dedup clusters: one block per cluster, all members shown
with title and short snippet. Helps a (human or LLM) annotator decide TP/FP
without scrolling huge multi-line CSV cells.
"""
import csv
import os
import sys
from collections import OrderedDict

PATH = os.path.join("eval_out", "dedup_sample.csv")

with open(PATH, "r", encoding="utf-8-sig", newline="") as f:
    rows = list(csv.DictReader(f))

clusters: "OrderedDict[str, list[dict]]" = OrderedDict()
for r in rows:
    clusters.setdefault(r["cluster_id"], []).append(r)

sys.stdout = open(1, "w", encoding="utf-8", closefd=False)
print(f"Total clusters in sample: {len(clusters)}")

for i, (cid, members) in enumerate(clusters.items(), 1):
    print(f"\n=== CLUSTER {i:02d}/{len(clusters)} ===  cluster_id={cid}  members_in_sample={len(members)}  cluster_size={members[0]['cluster_size']}")
    for m in members:
        title = (m["title"] or "").replace("\n", " ").strip()
        snippet = (m["snippet"] or "").replace("\n", " ").strip()[:200]
        print(f"  - mention {m['row_in_cluster']}: {title}")
        print(f"    {snippet}")
        print(f"    URL: {m['url']}")
