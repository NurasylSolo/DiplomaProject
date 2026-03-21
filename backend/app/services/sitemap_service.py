from __future__ import annotations

import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from urllib.parse import urljoin

import httpx


SITEMAP_CANDIDATES = [
    "/sitemap.xml",
    "/news-sitemap.xml",
    "/sitemap_index.xml",
]


def _extract_xml_urls(xml_text: str) -> list[str]:
    urls: list[str] = []
    try:
        root = ET.fromstring(xml_text)
    except Exception:
        return urls
    for tag in root.iter():
        local = tag.tag.split("}")[-1].lower()
        if local == "loc" and tag.text:
            urls.append(tag.text.strip())
    return urls


async def fetch_sitemap_urls(
    client: httpx.AsyncClient,
    base_url: str,
    limit: int = 100,
) -> list[dict]:
    discovered: list[str] = []
    for path in SITEMAP_CANDIDATES:
        sitemap_url = urljoin(base_url.rstrip("/") + "/", path.lstrip("/"))
        try:
            response = await client.get(sitemap_url)
            if response.status_code >= 400:
                continue
            discovered.extend(_extract_xml_urls(response.text))
        except Exception:
            continue
        if len(discovered) >= limit:
            break

    out: list[dict] = []
    seen: set[str] = set()
    for url in discovered:
        if url in seen:
            continue
        seen.add(url)
        out.append(
            {
                "url": url,
                "title": "",
                "summary": "",
                "published_at": datetime.now(timezone.utc),
                "raw_payload": {"origin": base_url, "mode": "sitemap"},
            }
        )
        if len(out) >= limit:
            break
    return out

