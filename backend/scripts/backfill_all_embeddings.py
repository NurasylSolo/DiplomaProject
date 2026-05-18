"""Backfill RAG embeddings for every project in the database.

Used once after the pgvector migration — there were no real embeddings
in mention_embeddings (only hash fallbacks that the migration discarded),
so this re-populates the table with real OpenAI vectors.

Idempotent: ``backfill_project`` skips mentions that already have an
embedding, so running this twice doesn't double-bill.

Usage:
    python -m scripts.backfill_all_embeddings
"""
from __future__ import annotations

import asyncio
import sys
import time

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.project import Project
from app.services import embedding_service


async def main() -> int:
    async with AsyncSessionLocal() as db:
        projects = (
            await db.execute(select(Project.id, Project.name).order_by(Project.created_at))
        ).all()

    print(f"Found {len(projects)} projects. Starting backfill...\n", flush=True)
    grand_total_new = 0
    grand_total_failed = 0
    overall_start = time.perf_counter()

    for idx, (project_id, project_name) in enumerate(projects, 1):
        # Each project gets its own session — keeps transactions small
        # and means a failure on one project doesn't poison the next.
        async with AsyncSessionLocal() as db:
            t0 = time.perf_counter()
            try:
                result = await embedding_service.backfill_project(
                    db, project_id, batch_size=50, max_mentions=20_000
                )
                await db.commit()
            except Exception as exc:
                await db.rollback()
                print(f"[{idx:>2}/{len(projects)}] {project_name!r:40} FAILED: {exc}", flush=True)
                continue

            dt = time.perf_counter() - t0
            new = result.get("newly_embedded", 0)
            failed = result.get("failed", 0)
            already = result.get("already_embedded", 0)
            total = result.get("total_mentions", 0)
            grand_total_new += new
            grand_total_failed += failed

            print(
                f"[{idx:>2}/{len(projects)}] "
                f"id={project_id[:8]}... "
                f"total={total:>4} already={already:>4} new={new:>4} failed={failed:>3} "
                f"in {dt:>5.1f}s",
                flush=True,
            )

    overall = time.perf_counter() - overall_start
    print(
        f"\nDone in {overall:.1f}s. New embeddings: {grand_total_new}, "
        f"failed: {grand_total_failed}",
        flush=True,
    )
    return 0 if grand_total_failed == 0 else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
