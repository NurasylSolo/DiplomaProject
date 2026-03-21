import asyncio
import uuid
from typing import Any

from app.config import settings
from app.database import AsyncSessionLocal
from app.services import ingestion_service
from app.tasks.kafka_bus import publish_task
from app.tasks.worker_tasks import (
    task_analyze_mention,
    task_crawl_source,
    task_recompute_project_metrics,
    task_refresh_project_mentions,
)


def _use_local_queue() -> bool:
    return settings.TASK_QUEUE_MODE.lower() == "local"


def _use_kafka_queue() -> bool:
    return settings.TASK_QUEUE_MODE.lower() == "kafka"


def _use_celery_queue() -> bool:
    return settings.TASK_QUEUE_MODE.lower() == "celery" and not settings.CELERY_TASK_ALWAYS_EAGER


def _run_local(coro) -> str:
    asyncio.create_task(coro)
    return "local"


async def _local_refresh(
    project_id: str,
    crawl_job_id: str,
    created_by: str | None,
    limit_sources: int | None,
    per_source_limit: int,
):
    async with AsyncSessionLocal() as db:
        await ingestion_service.run_project_ingestion(
            db=db,
            project_id=project_id,
            created_by=created_by,
            limit_sources=limit_sources,
            per_source_limit=per_source_limit,
            crawl_job_id=crawl_job_id,
        )
        await db.commit()


async def _local_crawl_source(
    source_id: str,
    crawl_job_id: str,
    created_by: str | None,
    per_source_limit: int,
):
    async with AsyncSessionLocal() as db:
        await ingestion_service.run_source_ingestion(
            db=db,
            source_id=source_id,
            created_by=created_by,
            per_source_limit=per_source_limit,
            crawl_job_id=crawl_job_id,
        )
        await db.commit()


async def _local_analyze_mention(mention_id: str, crawl_job_id: str, created_by: str | None):
    async with AsyncSessionLocal() as db:
        await ingestion_service.analyze_mention(
            db=db,
            mention_id=mention_id,
            created_by=created_by,
            crawl_job_id=crawl_job_id,
        )
        await db.commit()


async def _local_recompute(project_id: str, crawl_job_id: str, created_by: str | None):
    async with AsyncSessionLocal() as db:
        await ingestion_service.recompute_project_metrics(
            db=db,
            project_id=project_id,
            created_by=created_by,
            crawl_job_id=crawl_job_id,
        )
        await db.commit()


def enqueue_refresh_project_mentions(
    project_id: str,
    crawl_job_id: str,
    created_by: str | None = None,
    limit_sources: int | None = None,
    per_source_limit: int = 30,
) -> str:
    if _use_local_queue():
        return _run_local(_local_refresh(project_id, crawl_job_id, created_by, limit_sources, per_source_limit))
    if _use_kafka_queue():
        task_id = str(uuid.uuid4())
        return publish_task(
            task_id=task_id,
            task_type="refresh_project_mentions",
            payload={
                "project_id": project_id,
                "crawl_job_id": crawl_job_id,
                "created_by": created_by,
                "limit_sources": limit_sources,
                "per_source_limit": per_source_limit,
            },
        )
    if _use_celery_queue():
        try:
            result = task_refresh_project_mentions.delay(project_id, crawl_job_id, created_by, limit_sources, per_source_limit)
            return result.id
        except Exception:
            return _run_local(_local_refresh(project_id, crawl_job_id, created_by, limit_sources, per_source_limit))
    return _run_local(_local_refresh(project_id, crawl_job_id, created_by, limit_sources, per_source_limit))


def enqueue_crawl_source(
    source_id: str,
    crawl_job_id: str,
    created_by: str | None = None,
    per_source_limit: int = 30,
) -> str:
    if _use_local_queue():
        return _run_local(_local_crawl_source(source_id, crawl_job_id, created_by, per_source_limit))
    if _use_kafka_queue():
        task_id = str(uuid.uuid4())
        return publish_task(
            task_id=task_id,
            task_type="crawl_source",
            payload={
                "source_id": source_id,
                "crawl_job_id": crawl_job_id,
                "created_by": created_by,
                "per_source_limit": per_source_limit,
            },
        )
    if _use_celery_queue():
        try:
            result = task_crawl_source.delay(source_id, crawl_job_id, created_by, per_source_limit)
            return result.id
        except Exception:
            return _run_local(_local_crawl_source(source_id, crawl_job_id, created_by, per_source_limit))
    return _run_local(_local_crawl_source(source_id, crawl_job_id, created_by, per_source_limit))


def enqueue_analyze_mention(
    mention_id: str,
    crawl_job_id: str,
    created_by: str | None = None,
) -> str:
    if _use_local_queue():
        return _run_local(_local_analyze_mention(mention_id, crawl_job_id, created_by))
    if _use_kafka_queue():
        task_id = str(uuid.uuid4())
        return publish_task(
            task_id=task_id,
            task_type="analyze_mention",
            payload={
                "mention_id": mention_id,
                "crawl_job_id": crawl_job_id,
                "created_by": created_by,
            },
        )
    if _use_celery_queue():
        try:
            result = task_analyze_mention.delay(mention_id, crawl_job_id, created_by)
            return result.id
        except Exception:
            return _run_local(_local_analyze_mention(mention_id, crawl_job_id, created_by))
    return _run_local(_local_analyze_mention(mention_id, crawl_job_id, created_by))


def enqueue_recompute_project_metrics(
    project_id: str,
    crawl_job_id: str,
    created_by: str | None = None,
) -> str:
    if _use_local_queue():
        return _run_local(_local_recompute(project_id, crawl_job_id, created_by))
    if _use_kafka_queue():
        task_id = str(uuid.uuid4())
        return publish_task(
            task_id=task_id,
            task_type="recompute_project_metrics",
            payload={
                "project_id": project_id,
                "crawl_job_id": crawl_job_id,
                "created_by": created_by,
            },
        )
    if _use_celery_queue():
        try:
            result = task_recompute_project_metrics.delay(project_id, crawl_job_id, created_by)
            return result.id
        except Exception:
            return _run_local(_local_recompute(project_id, crawl_job_id, created_by))
    return _run_local(_local_recompute(project_id, crawl_job_id, created_by))
