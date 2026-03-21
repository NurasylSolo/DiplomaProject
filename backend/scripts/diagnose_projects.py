import argparse
import asyncio
import json

from sqlalchemy import desc, func, select

from app.database import AsyncSessionLocal
from app.models.crawl_job import CrawlJob
from app.models.mention import Mention
from app.models.project import Project
from app.models.source import Source


async def _run(name_like: str, limit: int) -> None:
    async with AsyncSessionLocal() as db:
        projects = (
            await db.execute(
                select(Project)
                .where(Project.name.ilike(f"%{name_like}%"))
                .order_by(desc(Project.created_at))
                .limit(limit)
            )
        ).scalars().all()
        out = []
        for p in projects:
            source_count = int(
                (
                    await db.execute(
                        select(func.count()).select_from(Source).where(Source.project_id == p.id)
                    )
                ).scalar_one()
            )
            mention_count = int(
                (
                    await db.execute(
                        select(func.count()).select_from(Mention).where(Mention.project_id == p.id)
                    )
                ).scalar_one()
            )
            jobs = (
                await db.execute(
                    select(
                        CrawlJob.id,
                        CrawlJob.status,
                        CrawlJob.items_fetched,
                        CrawlJob.items_saved,
                        CrawlJob.items_deduplicated,
                        CrawlJob.error,
                        CrawlJob.created_at,
                    )
                    .where(CrawlJob.project_id == p.id)
                    .order_by(desc(CrawlJob.created_at))
                    .limit(5)
                )
            ).all()
            out.append(
                {
                    "project_id": p.id,
                    "name": p.name,
                    "source_count": source_count,
                    "mention_count": mention_count,
                    "jobs": [
                        {
                            "id": j[0],
                            "status": j[1],
                            "fetched": j[2],
                            "saved": j[3],
                            "deduped": j[4],
                            "error": (j[5] or "")[:180],
                            "created_at": str(j[6]),
                        }
                        for j in jobs
                    ],
                }
            )
    print(json.dumps(out, ensure_ascii=False, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser(description="Diagnose project ingestion and mentions by name")
    parser.add_argument("--name-like", default="astana", help="Substring to match project name")
    parser.add_argument("--limit", type=int, default=5)
    args = parser.parse_args()
    asyncio.run(_run(name_like=args.name_like, limit=max(1, args.limit)))


if __name__ == "__main__":
    main()
