from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select
from datetime import datetime, timezone

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.project import Project
from app.services import ingestion_service
from app.tasks.dispatcher import enqueue_refresh_project_mentions


async def _refresh_all_projects_job():
    """Periodic refresh. Skips any project that already has a running/pending
    job so we never pile up a 'thundering herd' of duplicate ingestion runs
    (which would saturate the DB pool and the OpenAI rate limit). Actual
    concurrency is further bounded by the dispatcher's refresh semaphore."""
    from app.models.crawl_job import CrawlJob

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Project.id))
        project_ids = [row[0] for row in result.all()]

        # Projects that already have an in-flight job — don't re-enqueue them.
        active_rows = await db.execute(
            select(CrawlJob.project_id)
            .where(CrawlJob.status.in_(("running", "pending")))
            .distinct()
        )
        active_project_ids = {row[0] for row in active_rows.all()}

        for project_id in project_ids:
            if project_id in active_project_ids:
                continue
            crawl_job = await ingestion_service.create_crawl_job(
                db=db,
                project_id=project_id,
                source_id=None,
                created_by=None,
                job_type="refresh_project_mentions",
                status="pending",
                idempotency_key=f"scheduler:project_refresh:{project_id}:{datetime.now(timezone.utc).strftime('%Y%m%d%H')}",
            )
            await db.commit()
            enqueue_refresh_project_mentions(
                project_id=project_id,
                crawl_job_id=crawl_job.id,
                created_by=None,
                limit_sources=None,
                per_source_limit=30,
            )


def build_scheduler() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler(timezone="UTC")
    scheduler.add_job(
        _refresh_all_projects_job,
        trigger="interval",
        minutes=max(1, settings.SCHEDULER_REFRESH_INTERVAL_MINUTES),
        id="refresh_all_projects_mentions",
        replace_existing=True,
    )
    return scheduler
