"""Find which projects have enough multi-mention clusters for the 50-cluster audit."""
import asyncio
import io
import sys
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DSN = "postgresql+asyncpg://postgres:nurabi12@localhost:5435/senti_news"

OUT = io.StringIO()


async def main() -> None:
    engine = create_async_engine(DSN)
    async with engine.connect() as conn:
        rows = (await conn.execute(text("""
            SELECT
              p.id, p.name,
              count(DISTINCT m.id) AS mentions,
              count(DISTINCT m.cluster_id) AS clusters,
              count(DISTINCT CASE WHEN cs.cnt > 1 THEN m.cluster_id END) AS multi_clusters
            FROM projects p
            LEFT JOIN mentions m ON m.project_id = p.id
            LEFT JOIN (
              SELECT cluster_id, count(*) AS cnt
              FROM mentions
              WHERE cluster_id IS NOT NULL
              GROUP BY cluster_id
            ) cs ON cs.cluster_id = m.cluster_id
            GROUP BY p.id, p.name
            HAVING count(DISTINCT m.id) > 0
            ORDER BY multi_clusters DESC, mentions DESC
            LIMIT 15
        """))).all()
        OUT.write(f"{'mentions':>10} {'clusters':>10} {'multi':>8}  project_id  name\n")
        for r in rows:
            OUT.write(f"{r.mentions:>10} {r.clusters:>10} {r.multi_clusters:>8}  {r.id}  {r.name!r}\n")
    await engine.dispose()
    sys.stdout = open(1, "w", encoding="utf-8", closefd=False)
    print(OUT.getvalue())
    with open("eval_clusters_probe.out.txt", "w", encoding="utf-8") as f:
        f.write(OUT.getvalue())


if __name__ == "__main__":
    asyncio.run(main())
