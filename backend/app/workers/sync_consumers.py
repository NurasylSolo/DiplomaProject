from __future__ import annotations

import json

from kafka import KafkaConsumer

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.mention import Mention
from app.services.analytics_store_service import upsert_mention_fact
from app.services.search_sync_service import index_mention


def _consumer() -> KafkaConsumer:
    return KafkaConsumer(
        settings.KAFKA_SYNC_TOPIC,
        bootstrap_servers=[x.strip() for x in settings.KAFKA_BOOTSTRAP_SERVERS.split(",") if x.strip()],
        group_id=f"{settings.KAFKA_CONSUMER_GROUP}-sync",
        auto_offset_reset=settings.KAFKA_AUTO_OFFSET_RESET,
        enable_auto_commit=True,
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
    )


async def _load_mention(mention_id: str) -> Mention | None:
    async with AsyncSessionLocal() as db:
        return await db.get(Mention, mention_id)


def run_sync_consumer() -> None:
    consumer = _consumer()
    print(f"Sync consumer started. topic={settings.KAFKA_SYNC_TOPIC}")
    import asyncio

    for message in consumer:
        value = message.value or {}
        event_type = value.get("event_type")
        payload = value.get("payload") or {}
        if event_type != "mention_ingested":
            continue
        mention_id = payload.get("mention_id")
        if not mention_id:
            continue
        mention = asyncio.run(_load_mention(mention_id))
        if not mention:
            continue
        try:
            index_mention(mention)
            upsert_mention_fact(mention)
        except Exception as exc:  # pragma: no cover
            print(f"sync event failed mention_id={mention_id} error={exc}")


if __name__ == "__main__":
    run_sync_consumer()

