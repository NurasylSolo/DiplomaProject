"""Cross-process progress tracking for ingestion jobs.

Why this is in the database and not in process memory:
the kafka worker and the FastAPI backend run in different OS processes,
so an in-memory ``dict`` on the worker side was invisible to the API
that the frontend polls — the UI saw "0/?" for every job. Persisting
the counters on the ``crawl_jobs`` row makes the progress visible to
anyone with DB access (including a future second worker replica or an
ops dashboard) and survives process restarts.

Each function opens its OWN short-lived ``AsyncSessionLocal`` and
commits immediately, so progress is observable in real time regardless
of the long-running ingestion transaction the worker holds open. We
intentionally swallow errors here — a failed progress update must
never abort the ingestion that's actively making real progress.
"""
from __future__ import annotations

import logging

from sqlalchemy import func, update

from app.database import AsyncSessionLocal
from app.models.crawl_job import CrawlJob

logger = logging.getLogger(__name__)


async def reset_stale_jobs() -> int:
    """Close out jobs left in ``running``/``pending`` by a previous process.

    Called once on backend startup. A freshly started process has no
    ingestion actually in flight (local asyncio tasks die with their
    process; a Kafka worker re-consumes from scratch), so any job still
    marked running/pending is an orphan from a crash or restart. Marking
    them ``failed`` stops the frontend from spinning forever on a job that
    nothing is executing — the UI then offers Retry / Open anyway.

    Returns the number of jobs reset. Best-effort: never raises.
    """
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                update(CrawlJob)
                .where(CrawlJob.status.in_(("running", "pending")))
                .values(
                    status="failed",
                    error="Прервано: сервер был перезапущен. Запустите сбор заново.",
                    finished_at=func.now(),
                    worker_id=None,
                )
            )
            await db.commit()
            return int(result.rowcount or 0)
    except Exception as exc:
        logger.warning("reset_stale_jobs failed: %s", exc)
        return 0


async def start_job(job_id: str, total_sources: int) -> None:
    """Mark a job as in-progress with a known ``total_sources``."""
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(
                update(CrawlJob)
                .where(CrawlJob.id == job_id)
                .values(
                    total_sources=max(0, int(total_sources)),
                    processed_sources=0,
                )
            )
            await db.commit()
    except Exception as exc:
        logger.warning("start_job(%s) failed: %s", job_id, exc)


async def advance_job(job_id: str, delta: int = 1) -> None:
    """Bump ``processed_sources`` atomically. Uses a SQL expression so
    concurrent updates from a future multi-worker setup can't race.
    """
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(
                update(CrawlJob)
                .where(CrawlJob.id == job_id)
                .values(processed_sources=CrawlJob.processed_sources + int(delta))
            )
            await db.commit()
    except Exception as exc:
        logger.warning("advance_job(%s) failed: %s", job_id, exc)


async def update_progress(
    job_id: str,
    *,
    processed: int | None = None,
    fetched: int | None = None,
    saved: int | None = None,
    deduplicated: int | None = None,
    stage: str | None = None,
) -> None:
    """Live progress update during a run.

    Persists the running item counters and the human-readable current stage
    (which source is being scanned right now) so the UI reflects real-time
    activity instead of showing 0/0/0 until the very end. The current stage
    is stored on the otherwise-unused ``worker_id`` column to avoid a schema
    migration. Best-effort: never raises.
    """
    values: dict = {}
    if processed is not None:
        values["processed_sources"] = max(0, int(processed))
    if fetched is not None:
        values["items_fetched"] = max(0, int(fetched))
    if saved is not None:
        values["items_saved"] = max(0, int(saved))
    if deduplicated is not None:
        values["items_deduplicated"] = max(0, int(deduplicated))
    if stage is not None:
        values["worker_id"] = str(stage)[:100]
    if not values:
        return
    try:
        async with AsyncSessionLocal() as db:
            await db.execute(
                update(CrawlJob).where(CrawlJob.id == job_id).values(**values)
            )
            await db.commit()
    except Exception as exc:
        logger.warning("update_progress(%s) failed: %s", job_id, exc)


async def finish_job(
    job_id: str, *, failed: bool = False, error: str | None = None
) -> None:
    """Close out the progress counters. On success, set processed=total
    so the percent computation hits 100. On failure, just record the
    error — leave the partial progress counters as-is for diagnostics.
    """
    try:
        async with AsyncSessionLocal() as db:
            if failed:
                await db.execute(
                    update(CrawlJob)
                    .where(CrawlJob.id == job_id)
                    .values(error=(error or "")[:2000] or None)
                )
            else:
                # Equalise processed_sources to total_sources via SQL so the
                # update is one round-trip without needing to read first.
                await db.execute(
                    update(CrawlJob)
                    .where(CrawlJob.id == job_id)
                    .values(
                        processed_sources=CrawlJob.total_sources,
                        error=None,
                        worker_id=None,
                    )
                )
            await db.commit()
    except Exception as exc:
        logger.warning("finish_job(%s) failed: %s", job_id, exc)


def progress_percent(job: CrawlJob) -> int:
    """Compute the percent label the frontend shows. Pure function on
    a loaded ``CrawlJob`` — no DB access — so the API route can call it
    on whatever row it already has.
    """
    status = job.status
    total = int(job.total_sources or 0)
    processed = int(job.processed_sources or 0)
    if status == "completed":
        return 100
    if status == "failed":
        return 0
    if total <= 0:
        return 0
    return max(0, min(99, int((processed / total) * 100)))
