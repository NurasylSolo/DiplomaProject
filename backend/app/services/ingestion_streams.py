from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

import httpx

from app.crawlers import crawl_html_page
from app.models.source import Source
from app.models.source_fetch_state import SourceFetchState
from app.services.connectors import ConnectorItem, resolve_connector
from app.services.sitemap_service import fetch_sitemap_urls


@dataclass
class StreamResult:
    items: list[ConnectorItem]
    stream_name: str


def _to_connector_items(rows: list[dict], source_name: str) -> list[ConnectorItem]:
    out: list[ConnectorItem] = []
    now = datetime.now(timezone.utc)
    for row in rows:
        out.append(
            ConnectorItem(
                url=str(row.get("url") or ""),
                title=str(row.get("title") or ""),
                summary=str(row.get("summary") or ""),
                published_at=row.get("published_at") or now,
                source_name=source_name,
                raw_payload=row.get("raw_payload") or {},
            )
        )
    return out


async def fetch_stream_items(
    client: httpx.AsyncClient,
    source: Source,
    state: SourceFetchState,
    limit: int,
    request_headers: dict[str, str] | None = None,
) -> StreamResult:
    stype = (source.type or "").lower()
    if stype in {"html", "websites"}:
        rows = await crawl_html_page(client=client, base_url=source.base_url, limit=limit)
        return StreamResult(items=_to_connector_items(rows, source.name), stream_name="html")
    if stype in {"sitemap"}:
        rows = await fetch_sitemap_urls(client=client, base_url=source.base_url, limit=limit)
        return StreamResult(items=_to_connector_items(rows, source.name), stream_name="sitemap")

    # Default to fast RSS/API stream.
    connector = resolve_connector(source.type)
    items = await connector.fetch(
        client=client,
        source=source,
        state=state,
        limit=limit,
        request_headers=request_headers or {},
    )
    return StreamResult(items=items, stream_name="rss_api")

