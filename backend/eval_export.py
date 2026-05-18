"""Evaluation export — produces CSVs and a JSON summary needed for thesis 2.4.1.

Outputs (all UTF-8 with BOM so Excel opens Cyrillic correctly):
  - eval_out/perf_summary.json   — performance numbers from crawl_jobs
  - eval_out/sentiment_sample.csv — 100 random mentions for manual labeling
  - eval_out/dedup_sample.csv    — 50 cluster groups for dedup audit
  - eval_out/project_stats.json  — counts for the chosen project
"""
import asyncio
import csv
import io
import json
import os
import statistics
import sys
import uuid
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DSN = "postgresql+asyncpg://postgres:nurabi12@localhost:5435/senti_news"
PROJECT_ID = "e789863a-f2f2-468a-9285-8d5b3d695807"  # Adidas — 764 mentions, 472 multi-clusters
SAMPLE_N_SENTIMENT = 100
SAMPLE_N_CLUSTERS = 50
OUT_DIR = "eval_out"


def _w(path: str, content: str) -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, path), "w", encoding="utf-8-sig", newline="") as f:
        f.write(content)


async def collect_performance(conn) -> dict:
    """All completed jobs that actually did work (fetched>0)."""
    rows = (await conn.execute(text("""
        SELECT
          id, project_id,
          EXTRACT(EPOCH FROM (finished_at - started_at)) AS dur,
          items_fetched, items_saved, items_deduplicated
        FROM crawl_jobs
        WHERE status='completed'
          AND finished_at IS NOT NULL AND started_at IS NOT NULL
          AND items_fetched > 0
        ORDER BY finished_at DESC
    """))).all()
    durs = [float(r.dur) for r in rows if r.dur is not None]
    fetched = [int(r.items_fetched or 0) for r in rows]
    saved = [int(r.items_saved or 0) for r in rows]
    dedup = [int(r.items_deduplicated or 0) for r in rows]

    def pct(xs, p):
        if not xs:
            return None
        xs = sorted(xs)
        k = max(0, min(len(xs) - 1, int(round((p / 100.0) * (len(xs) - 1)))))
        return xs[k]

    last20 = durs[:20]
    return {
        "total_completed_jobs": len(rows),
        "duration_seconds": {
            "min": min(durs) if durs else None,
            "max": max(durs) if durs else None,
            "mean": statistics.mean(durs) if durs else None,
            "median": statistics.median(durs) if durs else None,
            "p95": pct(durs, 95),
            "stdev": statistics.pstdev(durs) if len(durs) > 1 else None,
        },
        "duration_seconds_last20": {
            "min": min(last20) if last20 else None,
            "max": max(last20) if last20 else None,
            "mean": statistics.mean(last20) if last20 else None,
            "median": statistics.median(last20) if last20 else None,
        },
        "items_fetched": {
            "mean": statistics.mean(fetched) if fetched else None,
            "median": statistics.median(fetched) if fetched else None,
            "max": max(fetched) if fetched else None,
        },
        "items_saved_mean": statistics.mean(saved) if saved else None,
        "items_dedup_mean": statistics.mean(dedup) if dedup else None,
        "seconds_per_article_mean": (
            statistics.mean([d / s for d, s in zip(durs, saved) if s > 0])
            if any(s > 0 for s in saved) else None
        ),
    }


async def collect_project_stats(conn, project_id: str) -> dict:
    name = (await conn.execute(text(
        "SELECT name FROM projects WHERE id=:pid"), {"pid": project_id})).scalar()
    n_mentions = (await conn.execute(text(
        "SELECT count(*) FROM mentions WHERE project_id=:pid"), {"pid": project_id})).scalar()
    n_raw = (await conn.execute(text(
        "SELECT count(*) FROM raw_documents WHERE project_id=:pid"), {"pid": project_id})).scalar()
    n_sources = (await conn.execute(text(
        "SELECT count(DISTINCT source_id) FROM mentions WHERE project_id=:pid"), {"pid": project_id})).scalar()
    n_lang = (await conn.execute(text(
        "SELECT count(DISTINCT language) FROM mentions WHERE project_id=:pid AND language IS NOT NULL"), {"pid": project_id})).scalar()
    langs = [r[0] for r in (await conn.execute(text(
        "SELECT DISTINCT language FROM mentions WHERE project_id=:pid AND language IS NOT NULL"), {"pid": project_id})).all()]
    n_clusters = (await conn.execute(text(
        "SELECT count(DISTINCT cluster_id) FROM mentions WHERE project_id=:pid AND cluster_id IS NOT NULL"), {"pid": project_id})).scalar()
    n_dup_clusters = (await conn.execute(text("""
        SELECT count(*) FROM (
          SELECT cluster_id FROM mentions
          WHERE project_id=:pid AND cluster_id IS NOT NULL
          GROUP BY cluster_id HAVING count(*) > 1
        ) sub
    """), {"pid": project_id})).scalar()
    job_rows = (await conn.execute(text("""
        SELECT items_fetched, items_saved, items_deduplicated
        FROM crawl_jobs
        WHERE project_id=:pid AND status='completed' AND items_fetched > 0
    """), {"pid": project_id})).all()
    total_fetched = sum(int(r.items_fetched or 0) for r in job_rows)
    total_dedup = sum(int(r.items_deduplicated or 0) for r in job_rows)
    return {
        "project_id": project_id,
        "project_name": name,
        "mentions_after_dedup": n_mentions,
        "raw_documents": n_raw,
        "distinct_source_domains": n_sources,
        "languages_observed_count": n_lang,
        "languages_observed": sorted(langs),
        "total_clusters": n_clusters,
        "clusters_with_duplicates": n_dup_clusters,
        "total_fetched_across_runs": total_fetched,
        "cross_source_duplicates_total": total_dedup,
    }


async def export_sentiment_sample(conn, project_id: str, n: int) -> int:
    rows = (await conn.execute(text("""
        SELECT id, title, snippet, body, language, sentiment_label, sentiment_score, url
        FROM mentions
        WHERE project_id=:pid AND sentiment_label IS NOT NULL
        ORDER BY random()
        LIMIT :n
    """), {"pid": project_id, "n": n})).all()

    buf = io.StringIO()
    w = csv.writer(buf, quoting=csv.QUOTE_ALL)
    w.writerow([
        "mention_id", "title", "snippet", "language",
        "model_label", "model_score", "url",
        "your_label", "agree", "notes",
    ])
    for r in rows:
        snippet = (r.snippet or r.body or "")[:600]
        w.writerow([
            r.id, r.title or "", snippet, r.language or "",
            r.sentiment_label, round(float(r.sentiment_score or 0), 3),
            r.url or "",
            "", "", "",  # to be filled by human
        ])
    _w("sentiment_sample.csv", buf.getvalue())
    return len(rows)


async def export_dedup_sample(conn, project_id: str, n_clusters: int) -> int:
    """Pick clusters that have >1 mention, output up to 3 rows per cluster."""
    cluster_ids = [r[0] for r in (await conn.execute(text("""
        SELECT cluster_id FROM mentions
        WHERE project_id=:pid AND cluster_id IS NOT NULL
        GROUP BY cluster_id HAVING count(*) > 1
        ORDER BY random()
        LIMIT :n
    """), {"pid": project_id, "n": n_clusters})).all()]

    buf = io.StringIO()
    w = csv.writer(buf, quoting=csv.QUOTE_ALL)
    w.writerow([
        "cluster_id", "cluster_size", "row_in_cluster",
        "mention_id", "title", "snippet", "url",
        "verdict_TP_or_FP", "notes",
    ])
    for cid in cluster_ids:
        members = (await conn.execute(text("""
            SELECT id, title, snippet, body, url, cluster_size
            FROM mentions
            WHERE project_id=:pid AND cluster_id=:cid
            ORDER BY published_at NULLS LAST
            LIMIT 3
        """), {"pid": project_id, "cid": cid})).all()
        for i, r in enumerate(members, 1):
            snippet = (r.snippet or r.body or "")[:300]
            w.writerow([
                cid, r.cluster_size or len(members), i,
                r.id, r.title or "", snippet, r.url or "",
                "" if i == 1 else "",  # verdict on the cluster (fill once per cluster, top row)
                "",
            ])
    _w("dedup_sample.csv", buf.getvalue())
    return len(cluster_ids)


async def main() -> None:
    engine = create_async_engine(DSN)
    async with engine.connect() as conn:
        perf = await collect_performance(conn)
        proj = await collect_project_stats(conn, PROJECT_ID)
        n_sent = await export_sentiment_sample(conn, PROJECT_ID, SAMPLE_N_SENTIMENT)
        n_cl = await export_dedup_sample(conn, PROJECT_ID, SAMPLE_N_CLUSTERS)
    await engine.dispose()

    _w("perf_summary.json", json.dumps(perf, indent=2, ensure_ascii=False, default=str))
    _w("project_stats.json", json.dumps(proj, indent=2, ensure_ascii=False, default=str))

    sys.stdout = open(1, "w", encoding="utf-8", closefd=False)
    print("=== Performance (all completed runs) ===")
    print(json.dumps(perf, indent=2, ensure_ascii=False, default=str))
    print("\n=== Project stats ===")
    print(json.dumps(proj, indent=2, ensure_ascii=False, default=str))
    print(f"\nWrote: {OUT_DIR}/sentiment_sample.csv ({n_sent} rows)")
    print(f"Wrote: {OUT_DIR}/dedup_sample.csv ({n_cl} clusters, up to 3 rows each)")


if __name__ == "__main__":
    asyncio.run(main())
