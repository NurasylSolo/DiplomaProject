"""Find which user owns which project — needed to authenticate latency tests."""
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
        OUT.write("-- Users --\n")
        for r in (await conn.execute(text(
            "SELECT id, email, name, role, hashed_password IS NOT NULL AS has_pw FROM users LIMIT 30"
        ))).all():
            OUT.write(f"  {r.email!r:<40}  pw={r.has_pw}  id={r.id}  role={r.role}\n")

        OUT.write("\n-- Project owners (top 10 by mention count) --\n")
        for r in (await conn.execute(text("""
            SELECT p.id, p.name, p.owner_id, u.email, count(m.id) AS n
            FROM projects p
            LEFT JOIN users u ON u.id = p.owner_id
            LEFT JOIN mentions m ON m.project_id = p.id
            GROUP BY p.id, p.name, p.owner_id, u.email
            ORDER BY n DESC
            LIMIT 10
        """))).all():
            OUT.write(f"  {r.n:>5}  {r.name!r:<25}  owner={r.email!r}  proj={r.id}\n")
    await engine.dispose()
    sys.stdout = open(1, "w", encoding="utf-8", closefd=False)
    print(OUT.getvalue())


if __name__ == "__main__":
    asyncio.run(main())
