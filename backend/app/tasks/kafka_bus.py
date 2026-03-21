import json
from datetime import datetime, timezone

from kafka import KafkaProducer

from app.config import settings

_producer: KafkaProducer | None = None


def _get_producer() -> KafkaProducer:
    global _producer
    if _producer is None:
        _producer = KafkaProducer(
            bootstrap_servers=[x.strip() for x in settings.KAFKA_BOOTSTRAP_SERVERS.split(",") if x.strip()],
            value_serializer=lambda value: json.dumps(value).encode("utf-8"),
            key_serializer=lambda value: value.encode("utf-8"),
        )
    return _producer


def publish_task(task_id: str, task_type: str, payload: dict) -> str:
    producer = _get_producer()
    message = {
        "task_id": task_id,
        "task_type": task_type,
        "payload": payload,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    producer.send(settings.KAFKA_TASKS_TOPIC, key=task_id, value=message)
    producer.flush(timeout=10)
    return task_id


def publish_sync_event(event_id: str, event_type: str, payload: dict) -> str:
    producer = _get_producer()
    message = {
        "event_id": event_id,
        "event_type": event_type,
        "payload": payload,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    producer.send(settings.KAFKA_SYNC_TOPIC, key=event_id, value=message)
    producer.flush(timeout=10)
    return event_id

