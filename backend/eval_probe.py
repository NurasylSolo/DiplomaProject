"""One-shot probe for evaluation work — connects to the DB and reports
counts so we know what existing data is available without re-running ingestion.
"""
import asyncio
import io
import sys
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DSN = "postgresql+asyncpg://postgres:nurabi12@localhost:5435/senti_news"

OUT = io.StringIO()


def out(s: str = "") -> None:
    OUT.write(s + "\n")


async def main() -> None:
    engine = create_async_engine(DSN)
    async with engine.connect() as conn:
        for q, label in [
            ("SELECT count(*) FROM projects", "projects"),
            ("SELECT count(*) FROM mentions", "mentions"),
            ("SELECT count(*) FROM crawl_jobs", "crawl_jobs"),
            ("SELECT count(*) FROM crawl_jobs WHERE status='completed'", "completed_jobs"),
            ("SELECT count(*) FROM raw_documents", "raw_documents"),
        ]:
            n = (await conn.execute(text(q))).scalar()
            out(f"{label}: {n}")

        out("\n-- Top projects by mention count --")
        rows = (await conn.execute(text("""
            SELECT p.id, p.name, count(m.id) AS mentions
            FROM projects p
            LEFT JOIN mentions m ON m.project_id = p.id
            GROUP BY p.id, p.name
            ORDER BY mentions DESC
            LIMIT 10
        """))).all()
        for pid, name, n in rows:
            out(f"  {n:>5}  {pid}  {name!r}")

        out("\n-- Last 20 completed crawl_jobs --")
        rows = (await conn.execute(text("""
            SELECT id, project_id, started_at, finished_at,
                   items_fetched, items_saved, items_deduplicated
            FROM crawl_jobs
            WHERE status='completed' AND finished_at IS NOT NULL AND started_at IS NOT NULL
            ORDER BY finished_at DESC
            LIMIT 20
        """))).all()
        for jid, pid, started, finished, fetched, saved, dedup in rows:
            dur = (finished - started).total_seconds() if started and finished else None
            out(f"  {jid}  proj={pid}  dur={dur}s  fetched={fetched} saved={saved} dedup={dedup}")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
    sys.stdout = open(1, "w", encoding="utf-8", closefd=False)
    print(OUT.getvalue())
    with open("eval_probe.out.txt", "w", encoding="utf-8") as f:
        f.write(OUT.getvalue())
