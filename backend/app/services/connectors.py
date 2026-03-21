from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from urllib.parse import urljoin

import feedparser
import httpx

from app.models.source import Source
from app.models.source_fetch_state import SourceFetchState


@dataclass
class ConnectorItem:
    url: str
    title: str
    summary: str
    published_at: datetime
    source_name: str
    raw_payload: dict


class BaseConnector:
    source_type = "base"

    def candidate_urls(self, source: Source) -> list[str]:
        return [source.base_url]

    async def fetch(
        self,
        client: httpx.AsyncClient,
        source: Source,
        state: SourceFetchState,
        limit: int,
        request_headers: dict[str, str] | None = None,
    ) -> list[ConnectorItem]:
        raise NotImplementedError


class RssConnector(BaseConnector):
    source_type = "rss"

    def candidate_urls(self, source: Source) -> list[str]:
        base_url = source.base_url
        if any(x in base_url for x in [".xml", "/rss", "/feed", "atom"]):
            return [base_url]
        return [
            urljoin(base_url, "/feed"),
            urljoin(base_url, "/rss"),
            urljoin(base_url, "/rss.xml"),
            urljoin(base_url, "/atom.xml"),
        ]

    async def fetch(
        self,
        client: httpx.AsyncClient,
        source: Source,
        state: SourceFetchState,
        limit: int,
        request_headers: dict[str, str] | None = None,
    ) -> list[ConnectorItem]:
        headers = dict(request_headers or {})
        if state.etag:
            headers["If-None-Match"] = state.etag
        if state.last_modified:
            headers["If-Modified-Since"] = state.last_modified
        for rss_url in self.candidate_urls(source):
            try:
                response = await client.get(rss_url, headers=headers)
                if response.status_code == 304:
                    state.last_url = rss_url
                    return []
                if response.status_code >= 400:
                    continue
                state.etag = response.headers.get("ETag") or state.etag
                state.last_modified = response.headers.get("Last-Modified") or state.last_modified
                feed = feedparser.parse(response.text)
            except Exception:
                continue
            entries = list(getattr(feed, "entries", []) or [])[:limit]
            if not entries:
                continue
            state.last_url = rss_url
            items: list[ConnectorItem] = []
            for entry in entries:
                link = entry.get("link") or ""
                if not link:
                    continue
                title = (entry.get("title") or "").strip()
                summary = (entry.get("summary") or "").strip()
                published_raw = entry.get("published") or entry.get("updated")
                published_at = datetime.now(timezone.utc)
                if published_raw:
                    try:
                        parsed = parsedate_to_datetime(published_raw)
                        if parsed.tzinfo is None:
                            parsed = parsed.replace(tzinfo=timezone.utc)
                        published_at = parsed
                    except Exception:
                        pass
                items.append(
                    ConnectorItem(
                        url=link,
                        title=title,
                        summary=summary,
                        published_at=published_at,
                        source_name=source.name,
                        raw_payload={"entry": dict(entry)},
                    )
                )
            return items
        return []


class JsonApiConnector(BaseConnector):
    """
    Generic connector for official APIs that return JSON arrays.
    Expects either:
      - {"items": [{url,title,text,published_at}, ...]}
      - [{url,title,text,published_at}, ...]
    """

    source_type = "json_api"

    async def fetch(
        self,
        client: httpx.AsyncClient,
        source: Source,
        state: SourceFetchState,
        limit: int,
        request_headers: dict[str, str] | None = None,
    ) -> list[ConnectorItem]:
        response = await client.get(source.base_url, headers=request_headers or {})
        response.raise_for_status()
        data = response.json()
        rows = data.get("items", []) if isinstance(data, dict) else data
        items: list[ConnectorItem] = []
        for row in (rows or [])[:limit]:
            if not isinstance(row, dict):
                continue
            url = str(row.get("url") or "").strip()
            if not url:
                continue
            title = str(row.get("title") or "").strip()
            summary = str(row.get("text") or row.get("summary") or "").strip()
            published_raw = str(row.get("published_at") or row.get("published") or "")
            published_at = datetime.now(timezone.utc)
            if published_raw:
                try:
                    parsed = datetime.fromisoformat(published_raw.replace("Z", "+00:00"))
                    if parsed.tzinfo is None:
                        parsed = parsed.replace(tzinfo=timezone.utc)
                    published_at = parsed
                except Exception:
                    pass
            items.append(
                ConnectorItem(
                    url=url,
                    title=title,
                    summary=summary,
                    published_at=published_at,
                    source_name=source.name,
                    raw_payload=row,
                )
            )
        if items:
            state.last_url = source.base_url
        return items


CONNECTOR_BY_TYPE: dict[str, BaseConnector] = {
    "news": RssConnector(),
    "blogs": RssConnector(),
    "podcasts": RssConnector(),
    "videos": RssConnector(),
    "websites": RssConnector(),
    "other": RssConnector(),
    # Official/social adapters can point to JSON endpoint wrappers.
    "twitter": JsonApiConnector(),
    "facebook": JsonApiConnector(),
    "instagram": JsonApiConnector(),
    "linkedin": JsonApiConnector(),
    "youtube": JsonApiConnector(),
    "telegram": JsonApiConnector(),
    "tiktok": JsonApiConnector(),
}


def resolve_connector(source_type: str) -> BaseConnector:
    return CONNECTOR_BY_TYPE.get(source_type, RssConnector())

