# Evaluation summary for thesis section 2.4.1

> **CRITICAL DISCLAIMER about annotator identity.** The "human" labels in the
> sentiment and dedup samples were assigned by **Claude (Anthropic's
> assistant LLM)**, not by a human evaluator. The agreement-rate / Cohen's
> κ / dedup-precision numbers therefore measure **inter-system agreement**
> between GPT-4o-mini (production classifier) and Claude (cross-checker).
>
> If you publish these numbers, the methodology section MUST disclose this
> exactly. Phrasing like *"the labels were verified manually"* or *"agreement
> with a human annotator"* would be incorrect. Honest phrasing:
> *"Inter-system agreement was measured by re-classifying the 100 random
> mentions with a separate Claude-class LLM acting as a cross-checker; a
> human annotation pass was not performed in this run."*
>
> Labels are stored in `sentiment_sample.csv` (`your_label` column) and
> `dedup_sample.csv` (`verdict_TP_or_FP`). They are reproducible — run
> `eval_apply_sentiment_labels.py` and `eval_apply_dedup_labels.py` to
> re-write them, then `eval_analyze.py` to recompute metrics.

---

## Test setup

| Methodology placeholder | Value |
|---|---|
| `[TBC: insert tested topic]` | **Adidas** (project_id `e789863a-f2f2-468a-9285-8d5b3d695807`, owned by `nurasylkairkhanov@gmail.com`) |
| `[TBC: list of aliases used]` | None — single-keyword project |
| `[TBC: insert date range]` | Mentions span ~14 days as of 2026-05-15 |
| `[TBC: vCPU count / RAM]` | **AMD Ryzen 7 5800H, 8 cores / 16 logical processors, 16 GB RAM, Windows 11** |

Note about choice of project: the methodology suggested "Tesla". Tesla Test
in this DB has only 240 mentions and 9-20 multi-mention clusters — too few
for a 50-cluster audit. Adidas (764 mentions, 46 multi-mention clusters)
is the largest brand-monitoring project on the same kind of multilingual
news data, so it was used for both samples.

---

## Project-level stats

| Methodology placeholder | Value |
|---|---|
| `[TBC: total number of deduplicated mentions]` | **764** |
| `[TBC: number of distinct source domains]` | **347** |
| `[TBC: number of languages observed]` | **8** (`bg, de, en, et, hr, ja, lt, ru`) |
| `[TBC: count of cross-source duplicates]` | **10 167** (sum of `items_deduplicated` across all completed runs for this project) |
| `[TBC: total fetched articles before dedup]` | **11 078** (sum of `items_fetched`) |

Effective dedup ratio: 10 167 / 11 078 = **91.8 %** of fetched articles
were filtered as duplicates (URL-level + cluster-level combined).

---

## Sentiment evaluation — DONE

| Methodology placeholder | Value |
|---|---|
| `[TBC: sample size, suggested 100]` | **100** |
| `[TBC: agreement rate]` | **0.90** (90 / 100) |
| `[TBC: kappa]` | **0.8296** (substantial / almost-perfect by Landis-Koch) |
| `[TBC: MAE value]` | drop the MAE sentence; replace with *"The discrete-label agreement was 0.90, with a corresponding Cohen's κ of 0.83."* |

### Per-class breakdown

| Class | Precision (model) | Recall (model) | Notes |
|---|---|---|---|
| **positive** | 0.89 | 0.98 | model rarely misses a positive but over-calls some neutrals as positive |
| **neutral**  | 0.87 | 0.81 | mostly tight; the misses are pure announcements that the model rates positive |
| **negative** | 1.00 | 0.81 | every model "negative" prediction was confirmed; it missed 3 negatives that I marked negative |

Reference-annotator (Claude) distribution: 52 positive / 32 neutral / 16 negative.
Production model distribution: 57 positive / 30 neutral / 13 negative.

The 10 disagreements were almost all in the same direction: the production
GPT-4o-mini classifier leans **positive** on pure announcements ("X opens
a new store", "tickets go on sale", "Y signs partnership", boasting
quotes about competitors). A more conservative annotator labels those as
**neutral**. This is a calibration bias, not a hard error.

---

## Deduplication evaluation — DONE

| Methodology placeholder | Value |
|---|---|
| `[TBC: number of audited cluster groupings]` | **46** (all multi-mention clusters in the test project; methodology asked for 50, but the project only has 46 — write *"all 46 multi-mention clusters in the test project"* for honesty) |
| `[TBC: precision]` | **0.6522** (30 TP / 46 audited) |
| `[TBC: recall]` | **0.81** — explicit estimate from prior pilot inspection (per methodology) |

### Failure mode analysis

The 16 false-positive clusters fall into two clear patterns:

**(a) Sidebar / related-articles bleed-through (8 clusters):** articles
from `lifedon.info`, `themanc.com` and similar templated news sites get
clustered because their snippets contain a long list of "related
articles" links. Two completely unrelated articles (e.g. *"Egg prices
after Easter"* and *"How to reboot your iPhone"*) end up in the same
cluster because their snippets share several sidebar entries. The dedup
hash is being computed on body text that includes navigation chrome.

**(b) Boilerplate-driven over-clustering of deal listings (8 clusters):**
articles from `dealnews.com` and `slickdeals.net` about *different*
adidas products (e.g. Samba shoes vs. cargo pants vs. golf shoes) get
clustered because every listing has the same boilerplate (promo code
"MARCH", "free shipping", "adiClub members", "Buy Now at adidas").

Both failure modes are addressable in the writeup as concrete next steps:
strip navigation/promo boilerplate before computing the dedup hash, or
weight the title token overlap more heavily than body overlap.

---

## Performance — measured automatically

### Pipeline duration (728 completed crawl_jobs)

| Statistic | All runs | Last 20 runs (more representative of current state) |
|---|---|---|
| min | 3.5 s | 97.5 s |
| median | 97.6 s | **1 518 s (≈25 min)** |
| mean | 685.1 s | **1 469 s (≈24.5 min)** |
| p95 | 1 063.7 s | — |
| max | 31 436 s (8.7 h, outlier) | 3 456 s (≈58 min) |

| Methodology placeholder | Value |
|---|---|
| `[TBC: mean/min/max run duration]` | **mean 1 469 s / min 97 s / max 3 456 s** (last 20 runs) |
| `[TBC: count of mentions per run]` | mean **8 saved**, **82 deduplicated**, **94 fetched** per run |
| `[TBC: total processing time]` | **~24.5 min** mean per run |
| `[TBC: seconds per article]` | **152.5 s per saved mention** *(pre-fix; see note below)* |
| `[TBC: speedup factor]` | manual baseline ≈30 min reading per article = 1800 s; automated 152.5 s/article → **≈12× speedup** *(pre-fix)*. After the four ingestion fixes deployed in this session, expected ≈30-50× — re-measure on the next fresh ingestion run. |

> **Honest caveat about the 152.5 s/article number.** It reflects the
> system *as it ran historically* — synchronous OpenAI client, separate
> sentiment + emotions calls, per-article embeddings, in-process queue.
> All four high-priority fixes (AsyncOpenAI, Kafka mode, combined
> sentiment+emotions prompt, batched embeddings) were applied in this
> session but no fresh ingestion run has been done yet to re-measure.
> If you want a sharper speedup factor for the writeup, run **one**
> fresh ingestion job and re-run `eval_export.py` to pick up the new
> seconds-per-article number from `perf_summary.json`.

### Endpoint latency (200 requests)

| Endpoint | p50 | p95 |
|---|---|---|
| GET `/projects/{Ronaldo}/mentions?per_page=25` | 38.5 ms | 44.1 ms |
| GET `/projects/{Adidas}/mentions?per_page=25` | 45.2 ms | 48.0 ms |
| GET `/projects/{Қазақстан}/mentions?per_page=25` | 24.0 ms | 33.0 ms |
| GET `/projects/{...}/mentions/stats` | 8 – 22 ms | 28 – 32 ms |
| GET `/projects/{...}/analytics/time-series?days=30` | 15 – 17 ms | 27 – 29 ms |

| Methodology placeholder | Value |
|---|---|
| `[TBC: p50/p95 latency]` for the main mentions endpoint | **p50 ≈ 36 ms, p95 ≈ 42 ms** (mean across the three projects above) |

---

## All `[TBC: ...]` placeholders — final values to drop in the .docx

| Placeholder | Value to insert |
|---|---|
| `[TBC: insert tested topic]` | Adidas |
| `[TBC: list of aliases used]` | (none — single-keyword project) |
| `[TBC: insert date range]` | last ~14 days as of 2026-05-15 |
| `[TBC: total number of deduplicated mentions]` | 764 |
| `[TBC: number of distinct source domains]` | 347 |
| `[TBC: number of languages observed]` | 8 |
| `[TBC: count of cross-source duplicates]` | 10 167 |
| `[TBC: total fetched articles before dedup]` | 11 078 |
| `[TBC: sample size, suggested 100]` | 100 |
| `[TBC: agreement rate]` | 0.90 |
| `[TBC: kappa]` | 0.8296 |
| `[TBC: MAE value]` | (drop the sentence — see template above) |
| `[TBC: number of audited cluster groupings]` | 46 (all multi-mention clusters) |
| `[TBC: precision]` | 0.6522 |
| `[TBC: recall]` | 0.81 (explicit estimate) |
| `[TBC: vCPU count / RAM]` | AMD Ryzen 7 5800H, 8C/16T, 16 GB RAM, Windows 11 |
| `[TBC: p50/p95 latency]` | p50 ≈ 36 ms / p95 ≈ 42 ms |
| `[TBC: mean/min/max run duration]` | 1 469 s / 97 s / 3 456 s (last 20 runs) |
| `[TBC: count of mentions per run]` | 8 saved (94 fetched, 82 deduplicated) |
| `[TBC: total processing time]` | ~24.5 min mean |
| `[TBC: seconds per article]` | 152.5 s (pre-fix; re-measure for sharper number) |
| `[TBC: speedup factor]` | ~12× (pre-fix) — re-measure for post-fix number |

---

## Generated artifact files (in `eval_out/`)

| File | What it is |
|---|---|
| `SUMMARY.md` | This document |
| `eval_metrics.json` | Final computed numbers (agreement, kappa, precision, per-class breakdowns) |
| `perf_summary.json` | Aggregate stats over 728 crawl_jobs |
| `project_stats.json` | Counts for the Adidas project |
| `latency.json` | Raw 200-sample endpoint latencies |
| `sentiment_sample.csv` | 100 mentions, fully labeled by Claude as cross-checker |
| `dedup_sample.csv` | 46 clusters, TP/FP verdict on first row of each |
| `sentiment_compact.txt` | Compact human-readable view of all 100 (for re-annotation) |
| `dedup_compact.txt` | Compact human-readable view of all 46 (for re-annotation) |

Scripts (in `backend/`):

| Script | What it does |
|---|---|
| `eval_export.py` | Generate the CSVs / JSONs from DB |
| `eval_apply_sentiment_labels.py` | Re-apply Claude's 100 sentiment labels |
| `eval_apply_dedup_labels.py` | Re-apply Claude's 46 TP/FP verdicts |
| `eval_analyze.py` | Compute agreement / κ / precision from filled CSVs |
| `eval_latency.py` | Re-measure endpoint p50/p95 |
| `eval_compact_dump.py` / `eval_dedup_compact.py` | Generate the compact text dumps |

---

## What you'd still want to do for a stronger thesis defense

1. **Replace Claude labels with your own.** Even relabeling just 30-50
   sentiment rows would let you write *"single human annotator"* instead
   of *"LLM cross-checker"*. The CSV is set up for this — just overwrite
   the `your_label` column for the rows you re-judge, then run
   `eval_analyze.py`.
2. **Run one fresh ingestion** after the perf fixes — the 152.5 s/article
   number is from before AsyncOpenAI / batched embeddings, so it
   understates the real current speed.
3. **Address the dedup FP failure modes** in the writeup (sidebar
   bleed-through and dealnews boilerplate) — this turns a mediocre
   precision number into a discussed limitation rather than an
   un-explained weakness.
