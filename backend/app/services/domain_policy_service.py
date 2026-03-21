from __future__ import annotations

import random
import time
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.source_catalog import SourceCatalog
from app.models.source_catalog import SourceCatalogHealth, SourceCatalogPolicy


_domain_state: dict[str, dict] = {}
_robots_cache: dict[str, RobotFileParser] = {}

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/123.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/605.1.15 Version/17.3 Safari/605.1.15",
    "SentiNewsBot/2.0 (+https://example.local/bot)",
]


def _domain(url: str) -> str:
    try:
        return (urlparse(url).netloc or "").lower()
    except Exception:
        return ""


def get_rotating_user_agent() -> str:
    return random.choice(USER_AGENTS)


async def _load_policy(db: AsyncSession, domain: str) -> SourceCatalogPolicy | None:
    row = await db.execute(
        select(SourceCatalogPolicy)
        .join(SourceCatalog, SourceCatalog.id == SourceCatalogPolicy.source_catalog_id)
        .where(SourceCatalog.domain == domain)
    )
    return row.scalar_one_or_none()


async def enforce_rate_limit(db: AsyncSession, url: str) -> None:
    domain = _domain(url)
    if not domain:
        return
    policy = await _load_policy(db, domain)
    rpm = policy.max_requests_per_minute if policy else 60
    delay = max(0.01, 60.0 / float(max(1, rpm)))
    st = _domain_state.setdefault(domain, {"last_request_at": 0.0, "cb_state": "closed", "open_until": 0.0})
    now = time.time()
    sleep_for = (st["last_request_at"] + delay) - now
    if sleep_for > 0:
        time.sleep(min(sleep_for, 2.0))
    st["last_request_at"] = time.time()


def circuit_state(url: str) -> str:
    domain = _domain(url)
    if not domain:
        return "closed"
    st = _domain_state.setdefault(domain, {"last_request_at": 0.0, "cb_state": "closed", "open_until": 0.0})
    now = time.time()
    if st["cb_state"] == "open" and now >= st["open_until"]:
        st["cb_state"] = "half-open"
    return st["cb_state"]


def report_circuit_result(url: str, ok: bool) -> None:
    domain = _domain(url)
    if not domain:
        return
    st = _domain_state.setdefault(
        domain,
        {"last_request_at": 0.0, "cb_state": "closed", "open_until": 0.0, "failures": 0},
    )
    failures = int(st.get("failures", 0))
    if ok:
        st["failures"] = 0
        st["cb_state"] = "closed"
        return
    failures += 1
    st["failures"] = failures
    if failures >= 5:
        st["cb_state"] = "open"
        st["open_until"] = time.time() + 30.0


async def is_allowed_by_robots(client: httpx.AsyncClient, url: str, user_agent: str) -> bool:
    parsed = urlparse(url)
    if not parsed.scheme or not parsed.netloc:
        return True
    root = f"{parsed.scheme}://{parsed.netloc}"
    if root not in _robots_cache:
        rp = RobotFileParser()
        try:
            robots_url = f"{root}/robots.txt"
            response = await client.get(robots_url, timeout=10)
            if response.status_code < 400:
                rp.parse(response.text.splitlines())
            else:
                rp.parse([])
        except Exception:
            rp.parse([])
        _robots_cache[root] = rp
    return _robots_cache[root].can_fetch(user_agent, url)

