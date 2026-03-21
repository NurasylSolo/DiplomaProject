import asyncio

from app.database import AsyncSessionLocal
from app.services import ingestion_service
from app.tasks.celery_app import celery_app


@celery_app.task(
    name="tasks.refresh_project_mentions",
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def task_refresh_project_mentions(
    self,
    project_id: str,
    crawl_job_id: str,
    created_by: str | None = None,
    limit_sources: int | None = None,
    per_source_limit: int = 30,
) -> dict:
    async def _run() -> dict:
        async with AsyncSessionLocal() as db:
            job = await ingestion_service.run_project_ingestion(
                db=db,
                project_id=project_id,
                created_by=created_by,
                limit_sources=limit_sources,
                per_source_limit=per_source_limit,
                crawl_job_id=crawl_job_id,
            )
            await db.commit()
            return {"job_id": job.id, "status": job.status}

    return asyncio.run(_run())


@celery_app.task(
    name="tasks.crawl_source",
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def task_crawl_source(
    self,
    source_id: str,
    crawl_job_id: str,
    created_by: str | None = None,
    per_source_limit: int = 30,
) -> dict:
    async def _run() -> dict:
        async with AsyncSessionLocal() as db:
            job = await ingestion_service.run_source_ingestion(
                db=db,
                source_id=source_id,
                created_by=created_by,
                per_source_limit=per_source_limit,
                crawl_job_id=crawl_job_id,
            )
            await db.commit()
            return {"job_id": job.id, "status": job.status}

    return asyncio.run(_run())


@celery_app.task(
    name="tasks.analyze_mention",
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def task_analyze_mention(self, mention_id: str, crawl_job_id: str, created_by: str | None = None) -> dict:
    async def _run() -> dict:
        async with AsyncSessionLocal() as db:
            job = await ingestion_service.analyze_mention(
                db=db,
                mention_id=mention_id,
                created_by=created_by,
                crawl_job_id=crawl_job_id,
            )
            await db.commit()
            return {"job_id": job.id, "status": job.status}

    return asyncio.run(_run())


@celery_app.task(
    name="tasks.recompute_project_metrics",
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def task_recompute_project_metrics(
    self,
    project_id: str,
    crawl_job_id: str,
    created_by: str | None = None,
) -> dict:
    async def _run() -> dict:
        async with AsyncSessionLocal() as db:
            job = await ingestion_service.recompute_project_metrics(
                db=db,
                project_id=project_id,
                created_by=created_by,
                crawl_job_id=crawl_job_id,
            )
            await db.commit()
            return {"job_id": job.id, "status": job.status}

    return asyncio.run(_run())
