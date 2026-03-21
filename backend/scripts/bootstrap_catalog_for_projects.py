import argparse
import asyncio
import json

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.project import Project
from app.services import ingestion_service, source_service
from app.tasks.dispatcher import enqueue_refresh_project_mentions


async def _run(
    *,
    per_source_limit: int,
    min_trust_score: float,
    source_limit: int,
    only_project_id: str | None,
) -> None:
    report: list[dict] = []
    async with AsyncSessionLocal() as db:
        query = select(Project)
        if only_project_id:
            query = query.where(Project.id == only_project_id)
        projects = list((await db.execute(query)).scalars().all())

        for project in projects:
            attached = await source_service.attach_catalog_sources_to_project(
                db=db,
                project_id=project.id,
                filters={
                    "languages": ["en", "ru", "kz", "kk"],
                    "source_types": ["rss", "html", "api"],
                    "min_trust_score": min_trust_score,
                    "active_only": True,
                    "limit": source_limit,
                    "dry_run": False,
                },
            )
            await db.commit()

            job = await ingestion_service.create_crawl_job(
                db=db,
                project_id=project.id,
                source_id=None,
                created_by=project.owner_id,
                job_type="refresh_project_mentions",
                status="pending",
            )
            await db.commit()
            queue_task_id = enqueue_refresh_project_mentions(
                project_id=project.id,
                crawl_job_id=job.id,
                created_by=project.owner_id,
                per_source_limit=per_source_limit,
            )

            report.append(
                {
                    "project_id": project.id,
                    "project_name": project.name,
                    "attached": attached,
                    "job_id": job.id,
                    "queue_task_id": queue_task_id,
                }
            )

    print(json.dumps(report, ensure_ascii=False, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Attach source catalog to projects and start ingestion jobs"
    )
    parser.add_argument("--per-source-limit", type=int, default=60)
    parser.add_argument("--min-trust-score", type=float, default=0.35)
    parser.add_argument("--source-limit", type=int, default=2000)
    parser.add_argument("--project-id", default=None, help="Optional single project ID")
    args = parser.parse_args()
    asyncio.run(
        _run(
            per_source_limit=max(1, args.per_source_limit),
            min_trust_score=max(0.0, min(1.0, args.min_trust_score)),
            source_limit=max(1, args.source_limit),
            only_project_id=args.project_id,
        )
    )


if __name__ == "__main__":
    main()
