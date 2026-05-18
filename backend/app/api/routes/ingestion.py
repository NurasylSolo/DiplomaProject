from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.source import Source
from app.models.user import User
from app.schemas.ingestion import IngestionRunRequest
from app.services import ingestion_service
from app.services import job_progress_service
from app.services.project_service import get_project
from app.services import source_service
from app.services.source_service import get_source
from app.services.mention_service import get_mention_by_id
from app.core.exceptions import NotFoundError
from app.tasks.dispatcher import (
    enqueue_analyze_mention,
    enqueue_crawl_source,
    enqueue_recompute_project_metrics,
    enqueue_refresh_project_mentions,
)

router = APIRouter()


def _job_to_dict(job) -> dict:
    # Progress is persisted directly on the row by `job_progress_service`
    # so we just read whatever the worker last committed — no IPC needed.
    return {
        "id": job.id,
        "project_id": job.project_id,
        "source_id": job.source_id,
        "status": job.status,
        "job_type": job.job_type,
        "started_at": job.started_at.isoformat() if job.started_at else None,
        "finished_at": job.finished_at.isoformat() if job.finished_at else None,
        "items_fetched": job.items_fetched,
        "items_saved": job.items_saved,
        "items_deduplicated": job.items_deduplicated,
        "total_sources": int(job.total_sources or 0),
        "processed_sources": int(job.processed_sources or 0),
        "progress_percent": job_progress_service.progress_percent(job),
        "retry_count": job.retry_count,
        "max_retries": job.max_retries,
        "queue_latency_ms": job.queue_latency_ms,
        "duration_ms": job.duration_ms,
        "worker_id": job.worker_id,
        "idempotency_key": job.idempotency_key,
        "started_by_scheduler": job.started_by_scheduler,
        "error": job.error,
        "created_by": job.created_by,
        "created_at": job.created_at.isoformat() if job.created_at else "",
        "updated_at": job.updated_at.isoformat() if job.updated_at else "",
    }


@router.post("/projects/{project_id}/ingestion/run")
async def run_ingestion(
    project_id: str,
    payload: IngestionRunRequest | None = None,
    idempotency_key: str | None = None,
    auto_attach_catalog_if_low_sources: bool = True,
    min_sources_threshold: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    body = payload or IngestionRunRequest()
    attached_sources: dict | None = None
    if auto_attach_catalog_if_low_sources:
        source_count = int(
            (
                await db.execute(
                    select(func.count()).select_from(Source).where(Source.project_id == project_id)
                )
            ).scalar_one()
        )
        if source_count < min_sources_threshold:
            attached_sources = await source_service.attach_catalog_sources_to_project(
                db=db,
                project_id=project_id,
                filters={
                    "languages": ["en", "ru", "kz", "kk"],
                    "source_types": ["rss", "html", "api"],
                    "min_trust_score": 0.35,
                    "active_only": True,
                    "limit": 2000,
                    "dry_run": False,
                },
            )
            await db.commit()
    job = await ingestion_service.create_crawl_job(
        db=db,
        project_id=project_id,
        source_id=None,
        created_by=current_user.id,
        job_type="refresh_project_mentions",
        status="pending",
        idempotency_key=idempotency_key,
    )
    await db.commit()
    queue_task_id = enqueue_refresh_project_mentions(
        project_id=project_id,
        crawl_job_id=job.id,
        created_by=current_user.id,
        limit_sources=body.limit_sources,
        per_source_limit=body.per_source_limit,
    )
    return {
        "status": "queued",
        "job_id": job.id,
        "queue_task_id": queue_task_id,
        "job_type": "refresh_project_mentions",
        "attached_sources": attached_sources,
    }


@router.post("/projects/{project_id}/sources/{source_id}/crawl")
async def crawl_source(
    project_id: str,
    source_id: str,
    per_source_limit: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    source = await get_source(db, project_id, source_id)
    job = await ingestion_service.create_crawl_job(
        db=db,
        project_id=project_id,
        source_id=source.id,
        created_by=current_user.id,
        job_type="crawl_source",
        status="pending",
    )
    await db.commit()
    queue_task_id = enqueue_crawl_source(
        source_id=source.id,
        crawl_job_id=job.id,
        created_by=current_user.id,
        per_source_limit=per_source_limit,
    )
    return {
        "status": "queued",
        "job_id": job.id,
        "queue_task_id": queue_task_id,
        "job_type": "crawl_source",
    }


@router.post("/projects/{project_id}/mentions/{mention_id}/analyze")
async def analyze_mention(
    project_id: str,
    mention_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    mention = await get_mention_by_id(db, project_id, mention_id)
    job = await ingestion_service.create_crawl_job(
        db=db,
        project_id=project_id,
        source_id=mention.source_id,
        created_by=current_user.id,
        job_type="analyze_mention",
        status="pending",
    )
    await db.commit()
    queue_task_id = enqueue_analyze_mention(
        mention_id=mention.id,
        crawl_job_id=job.id,
        created_by=current_user.id,
    )
    return {
        "status": "queued",
        "job_id": job.id,
        "queue_task_id": queue_task_id,
        "job_type": "analyze_mention",
    }


@router.post("/projects/{project_id}/metrics/recompute")
async def recompute_project_metrics(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    job = await ingestion_service.create_crawl_job(
        db=db,
        project_id=project_id,
        source_id=None,
        created_by=current_user.id,
        job_type="recompute_project_metrics",
        status="pending",
    )
    await db.commit()
    queue_task_id = enqueue_recompute_project_metrics(
        project_id=project_id,
        crawl_job_id=job.id,
        created_by=current_user.id,
    )
    return {
        "status": "queued",
        "job_id": job.id,
        "queue_task_id": queue_task_id,
        "job_type": "recompute_project_metrics",
    }


@router.get("/ingestion/health")
async def ingestion_health(
    project_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if project_id:
        await get_project(db, project_id, current_user.id)
    return await ingestion_service.get_ingestion_health(db, project_id=project_id)


@router.get("/projects/{project_id}/ingestion/jobs")
async def list_jobs(
    project_id: str,
    limit: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    jobs = await ingestion_service.get_project_jobs(db, project_id, limit=min(max(limit, 1), 200))
    return [_job_to_dict(job) for job in jobs]


@router.get("/projects/{project_id}/ingestion/jobs/{job_id}")
async def get_job(
    project_id: str,
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    job = await ingestion_service.get_job_by_id(db, project_id, job_id)
    if not job:
        raise NotFoundError("Ingestion job not found")
    return _job_to_dict(job)
