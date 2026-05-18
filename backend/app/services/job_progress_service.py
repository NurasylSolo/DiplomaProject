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

from sqlalchemy import update

from app.database import AsyncSessionLocal
from app.models.crawl_job import CrawlJob

logger = logging.getLogger(__name__)


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
