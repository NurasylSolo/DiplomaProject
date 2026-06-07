import asyncio
import logging
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

logger = logging.getLogger(__name__)

# In "local" task mode every enqueue becomes an asyncio.create_task in the API
# process. The scheduler refreshes EVERY project at once, so without a global
# bound dozens of ingestion jobs run concurrently — exhausting the DB pool and
# saturating the OpenAI rate limit. This semaphore caps concurrent local
# project refreshes; the rest queue and run as slots free up.
_LOCAL_REFRESH_MAX_CONCURRENCY = 2
_local_refresh_semaphore: asyncio.Semaphore | None = None


def _get_refresh_semaphore() -> asyncio.Semaphore:
    global _local_refresh_semaphore
    if _local_refresh_semaphore is None:
        _local_refresh_semaphore = asyncio.Semaphore(_LOCAL_REFRESH_MAX_CONCURRENCY)
    return _local_refresh_semaphore


def _publish_or_local(task_type: str, task_id: str, payload: dict, local_coro) -> str:
    """Publish to Kafka, falling back to local execution if the broker is
    unreachable. Without this, every API request that creates a task hangs
    on the producer's flush() timeout when Kafka is down."""
    try:
        return publish_task(task_id=task_id, task_type=task_type, payload=payload)
    except Exception as exc:
        logger.warning(
            "Kafka publish failed for %s, falling back to local: %s", task_type, exc
        )
        return _run_local(local_coro)


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
    # Bound concurrent refreshes process-wide (see _get_refresh_semaphore).
    async with _get_refresh_semaphore():
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
        return _publish_or_local(
            task_type="refresh_project_mentions",
            task_id=str(uuid.uuid4()),
            payload={
                "project_id": project_id,
                "crawl_job_id": crawl_job_id,
                "created_by": created_by,
                "limit_sources": limit_sources,
                "per_source_limit": per_source_limit,
            },
            local_coro=_local_refresh(project_id, crawl_job_id, created_by, limit_sources, per_source_limit),
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
        return _publish_or_local(
            task_type="crawl_source",
            task_id=str(uuid.uuid4()),
            payload={
                "source_id": source_id,
                "crawl_job_id": crawl_job_id,
                "created_by": created_by,
                "per_source_limit": per_source_limit,
            },
            local_coro=_local_crawl_source(source_id, crawl_job_id, created_by, per_source_limit),
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
        return _publish_or_local(
            task_type="analyze_mention",
            task_id=str(uuid.uuid4()),
            payload={
                "mention_id": mention_id,
                "crawl_job_id": crawl_job_id,
                "created_by": created_by,
            },
            local_coro=_local_analyze_mention(mention_id, crawl_job_id, created_by),
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
        return _publish_or_local(
            task_type="recompute_project_metrics",
            task_id=str(uuid.uuid4()),
            payload={
                "project_id": project_id,
                "crawl_job_id": crawl_job_id,
                "created_by": created_by,
            },
            local_coro=_local_recompute(project_id, crawl_job_id, created_by),
        )
    if _use_celery_queue():
        try:
            result = task_recompute_project_metrics.delay(project_id, crawl_job_id, created_by)
            return result.id
        except Exception:
            return _run_local(_local_recompute(project_id, crawl_job_id, created_by))
    return _run_local(_local_recompute(project_id, crawl_job_id, created_by))
