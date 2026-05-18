"""Verify how many distinct clusters in Adidas project actually contain >1 mention."""
import asyncio
import io
import sys
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DSN = "postgresql+asyncpg://postgres:nurabi12@localhost:5435/senti_news"
PROJECT_ID = "e789863a-f2f2-468a-9285-8d5b3d695807"

OUT = io.StringIO()


async def main() -> None:
    engine = create_async_engine(DSN)
    async with engine.connect() as conn:
        rows = (await conn.execute(text("""
            SELECT cluster_id, count(*) AS sz
            FROM mentions
            WHERE project_id=:pid AND cluster_id IS NOT NULL
            GROUP BY cluster_id
            HAVING count(*) > 1
            ORDER BY sz DESC
        """), {"pid": PROJECT_ID})).all()
        OUT.write(f"Multi-mention clusters in Adidas: {len(rows)}\n")
        OUT.write("Top by size:\n")
        for cid, sz in rows[:15]:
            OUT.write(f"  size={sz}  cluster={cid}\n")

        # Also: pool of all multi-clusters across the WHOLE DB (per-project),
        # in case we need to draw 50 from many projects.
        rows2 = (await conn.execute(text("""
            SELECT count(*) FROM (
              SELECT project_id, cluster_id
              FROM mentions
              WHERE cluster_id IS NOT NULL
              GROUP BY project_id, cluster_id
              HAVING count(*) > 1
            ) sub
        """))).scalar()
        OUT.write(f"\nTotal multi-mention clusters across ALL projects: {rows2}\n")
    await engine.dispose()
    sys.stdout = open(1, "w", encoding="utf-8", closefd=False)
    print(OUT.getvalue())


if __name__ == "__main__":
    asyncio.run(main())
