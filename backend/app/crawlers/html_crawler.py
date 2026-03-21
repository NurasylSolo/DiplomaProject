from __future__ import annotations

import re
from datetime import datetime, timezone
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

from app.services.extractors import extract_article_text


async def crawl_html_page(
    client: httpx.AsyncClient,
    base_url: str,
    limit: int = 20,
) -> list[dict]:
    response = await client.get(base_url)
    response.raise_for_status()
    html = response.text
    soup = BeautifulSoup(html, "html.parser")

    out: list[dict] = []
    seen: set[str] = set()
    for a in soup.find_all("a", href=True):
        href = (a.get("href") or "").strip()
        if not href:
            continue
        url = urljoin(base_url, href)
        if url in seen:
            continue
        seen.add(url)
        title = a.get_text(" ", strip=True) or ""
        if not title or len(title) < 5:
            continue
        # Skip obvious non-content links.
        if re.search(r"/(tag|category|author|login|signup|privacy|terms)\b", url, re.I):
            continue
        out.append(
            {
                "url": url,
                "title": title[:500],
                "summary": extract_article_text(html)[:1000],
                "published_at": datetime.now(timezone.utc),
                "raw_payload": {"origin": base_url, "mode": "html_crawler"},
            }
        )
        if len(out) >= limit:
            break
    return out

