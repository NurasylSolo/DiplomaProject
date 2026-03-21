from __future__ import annotations

from datetime import datetime

from app.config import settings

try:
    from opensearchpy import OpenSearch
except Exception:  # pragma: no cover
    OpenSearch = None


_client = None


def _get_client():
    global _client
    if _client is None and OpenSearch and settings.ENABLE_OPENSEARCH_SYNC:
        _client = OpenSearch(hosts=[settings.OPENSEARCH_URL])
    return _client


def _doc_from_mention(mention) -> dict:
    return {
        "id": mention.id,
        "project_id": mention.project_id,
        "source_id": mention.source_id,
        "title": mention.title,
        "body": mention.body,
        "snippet": mention.snippet,
        "url": mention.url,
        "published_at": mention.published_at.isoformat() if mention.published_at else None,
        "language": mention.language,
        "country": mention.country,
        "sentiment_label": mention.sentiment_label,
        "sentiment_score": mention.sentiment_score,
        "reach": mention.reach,
        "influence_score": mention.influence_score,
        "tags": mention.tags or [],
        "entities": mention.entities or [],
        "indexed_at": datetime.utcnow().isoformat(),
    }


def index_mention(mention) -> None:
    client = _get_client()
    if not client:
        return
    client.index(
        index=settings.OPENSEARCH_MENTIONS_INDEX,
        id=mention.id,
        body=_doc_from_mention(mention),
        refresh=False,
    )

