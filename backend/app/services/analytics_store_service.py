from __future__ import annotations

from datetime import datetime

from app.config import settings

try:
    import clickhouse_connect
except Exception:  # pragma: no cover
    clickhouse_connect = None


_client = None


def _get_client():
    global _client
    if _client is None and settings.ENABLE_CLICKHOUSE and clickhouse_connect and settings.CLICKHOUSE_DSN:
        _client = clickhouse_connect.get_client(dsn=settings.CLICKHOUSE_DSN)
    return _client


def upsert_mention_fact(mention) -> None:
    client = _get_client()
    if not client:
        return
    client.command(
        """
        INSERT INTO mentions_fact (
            mention_id, project_id, source_id, published_at, sentiment_label,
            sentiment_score, reach, influence_score, language, country, created_at
        ) VALUES
        """,
        data=[
            (
                mention.id,
                mention.project_id,
                mention.source_id,
                mention.published_at,
                mention.sentiment_label,
                float(mention.sentiment_score or 0.0),
                int(mention.reach or 0),
                float(mention.influence_score or 0.0),
                mention.language,
                mention.country,
                datetime.utcnow(),
            )
        ],
    )

