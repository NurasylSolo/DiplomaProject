import asyncio
import json
from typing import Any

from kafka import KafkaConsumer

from app.config import settings
from app.database import AsyncSessionLocal
from app.services import ingestion_service


def _consumer() -> KafkaConsumer:
    return KafkaConsumer(
        settings.KAFKA_TASKS_TOPIC,
        bootstrap_servers=[x.strip() for x in settings.KAFKA_BOOTSTRAP_SERVERS.split(",") if x.strip()],
        group_id=settings.KAFKA_CONSUMER_GROUP,
        auto_offset_reset=settings.KAFKA_AUTO_OFFSET_RESET,
        enable_auto_commit=True,
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
    )


async def _run_refresh(payload: dict[str, Any]) -> None:
    async with AsyncSessionLocal() as db:
        await ingestion_service.run_project_ingestion(
            db=db,
            project_id=payload["project_id"],
            crawl_job_id=payload["crawl_job_id"],
            created_by=payload.get("created_by"),
            limit_sources=payload.get("limit_sources"),
            per_source_limit=payload.get("per_source_limit", 30),
        )
        await db.commit()


async def _run_crawl_source(payload: dict[str, Any]) -> None:
    async with AsyncSessionLocal() as db:
        await ingestion_service.run_source_ingestion(
            db=db,
            source_id=payload["source_id"],
            crawl_job_id=payload["crawl_job_id"],
            created_by=payload.get("created_by"),
            per_source_limit=payload.get("per_source_limit", 30),
        )
        await db.commit()


async def _run_analyze(payload: dict[str, Any]) -> None:
    async with AsyncSessionLocal() as db:
        await ingestion_service.analyze_mention(
            db=db,
            mention_id=payload["mention_id"],
            crawl_job_id=payload["crawl_job_id"],
            created_by=payload.get("created_by"),
        )
        await db.commit()


async def _run_recompute(payload: dict[str, Any]) -> None:
    async with AsyncSessionLocal() as db:
        await ingestion_service.recompute_project_metrics(
            db=db,
            project_id=payload["project_id"],
            crawl_job_id=payload["crawl_job_id"],
            created_by=payload.get("created_by"),
        )
        await db.commit()


def _dispatch(task_type: str, payload: dict[str, Any]) -> None:
    if task_type == "refresh_project_mentions":
        asyncio.run(_run_refresh(payload))
    elif task_type == "crawl_source":
        asyncio.run(_run_crawl_source(payload))
    elif task_type == "analyze_mention":
        asyncio.run(_run_analyze(payload))
    elif task_type == "recompute_project_metrics":
        asyncio.run(_run_recompute(payload))


def run_worker() -> None:
    consumer = _consumer()
    print(f"Kafka worker started. topic={settings.KAFKA_TASKS_TOPIC}, group={settings.KAFKA_CONSUMER_GROUP}")
    for message in consumer:
        value = message.value or {}
        task_type = value.get("task_type")
        payload = value.get("payload") or {}
        try:
            _dispatch(task_type, payload)
        except Exception as exc:  # pragma: no cover
            print(f"Kafka task failed: task_type={task_type}, error={exc}")


if __name__ == "__main__":
    run_worker()

