from __future__ import annotations

import asyncio
import hashlib
import logging
import math
import re
import time
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

import httpx
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.crawl_job import CrawlJob
from app.models.mention import Mention
from app.models.project import Project
from app.models.raw_document import RawDocument
from app.models.source import Source
from app.services import dedup_service, job_progress_service, nlp_service

logger = logging.getLogger(__name__)

NEWS_API_BASE = "https://newsapi.org/v2/everything"
LOOKBACK_DAYS = 25

# Cap how many articles a single provider step contributes. Keeps total GPT
# work (and thus ingestion time) bounded and predictable for the demo: with
# ~19 steps that's at most ~19 * MAX_ARTICLES_PER_SOURCE articles to analyse.
# Sentiment runs on the cheap concurrent gpt-4o-mini, so a higher cap adds
# little time but much better coverage for popular topics.
MAX_ARTICLES_PER_SOURCE = 50

# Hard wall-clock budget for a single provider step (fetch + processing).
# If a source hangs (slow API, slow site crawl), we abandon that step instead
# of letting the whole job stall on it.
PER_SOURCE_TIME_BUDGET_SECONDS = 60

# Hard ceiling for an entire ingestion job. Once exceeded, remaining steps are
# skipped (progress still advances to 100%) so a project ALWAYS finishes and
# shows whatever data it gathered — never an endless "loading" spinner.
MAX_JOB_SECONDS = 300
# NewsAPI /everything has no country filter, but supports domains=. The
# global EN/RU queries plus a Kazakhstan-domains query maximise KZ coverage.
NEWS_API_VARIANTS: list[dict[str, str]] = [
    {"language": "en"},
    {"language": "ru"},
    {"domains": (
        "tengrinews.kz,zakon.kz,nur.kz,inform.kz,kapital.kz,vlast.kz,"
        "kursiv.kz,24.kz,kazinform.kz,forbes.kz,inbusiness.kz,liter.kz,time.kz"
    )},
]

SERP_API_BASE = "https://serpapi.com/search.json"
# Kazakhstan editions (ru/kk/en), mirroring the Google News RSS strategy.
# gl=kz enforces the KZ Google edition; location refines regional filtering
# (SerpAPI guidance: gl should be combined with location).
SERP_LANGUAGES = [
    {"hl": "ru", "gl": "kz", "location": "Kazakhstan"},
    {"hl": "kk", "gl": "kz", "location": "Kazakhstan"},
    {"hl": "en", "gl": "kz", "location": "Kazakhstan"},
]

NEWSDATA_API_BASE = "https://newsdata.io/api/1/latest"
# NOTE: NewsData.io does NOT support country=kz or language=kk (verified
# against its supported lists), so it cannot be geo-targeted to Kazakhstan.
# KZ coverage comes from Google News RSS, SerpAPI (gl=kz), EventRegistry
# (KZ source location) and NewsAPI (KZ domains) instead. Leave as en/ru.
NEWSDATA_LANGUAGES = ["en", "ru"]

EVENT_REGISTRY_API_BASE = "https://eventregistry.org/api/v1/article/getArticles"
# eng/rus globally, plus a variant restricted to Kazakhstan-based publishers
# (kaz is not an allowed EventRegistry lang, but sourceLocationUri works for
# any language).
EVENT_REGISTRY_VARIANTS: list[dict[str, str]] = [
    {"lang": "eng"},
    {"lang": "rus"},
    {"source_location": "http://en.wikipedia.org/wiki/Kazakhstan"},
]

WORLD_NEWS_API_BASE = "https://api.worldnewsapi.com/search-news"
# Per-variant requests: world EN/RU/KZ + Kazakhstan-specific source country.
WORLD_NEWS_VARIANTS: list[dict[str, str]] = [
    {"language": "en"},
    {"language": "ru"},
    {"language": "kk"},
    {"source-country": "kz"},
]

# GDELT DOC 2.0 — free, key-less global news index covering 100+ languages and
# nearly every country, updated every 15 min. ONE broad query already returns
# results across all languages/countries, so we issue a single request per job
# (GDELT strictly rate-limits to ~1 request / 5 seconds).
GDELT_DOC_BASE = "https://api.gdeltproject.org/api/v2/doc/doc"
GDELT_MAX_RECORDS = 250
GDELT_MIN_INTERVAL_SECONDS = 5.0

# Google News RSS — free, no API key, no rate limit. Best coverage of
# Kazakhstan media (Tengrinews, Zakon.kz, Qazinform, Nur.kz, Bes.media …)
# which the paid free-tier APIs barely index. Kazakhstan-focused editions:
GOOGLE_NEWS_BASE = "https://news.google.com/rss/search"
GOOGLE_NEWS_VARIANTS: list[dict[str, str]] = [
    {"hl": "ru", "gl": "KZ", "ceid": "KZ:ru"},
    {"hl": "kk", "gl": "KZ", "ceid": "KZ:kk"},
    {"hl": "en", "gl": "KZ", "ceid": "KZ:en"},
]

# Registry of known entities → official website crawl config. When a
# project's topic/aliases match one of the trigger phrases, we additionally
# crawl that entity's own site (sitemap-first, HTML fallback). Articles
# from the official site are guaranteed relevant so they bypass the keyword
# relevance filter.
OFFICIAL_SITE_REGISTRY: list[dict] = [
    {
        # NOTE: the bare acronym "aitu" is intentionally NOT here — it
        # collides with unrelated contexts (the Samoan word "aitu", other
        # organisations) and pulled in off-topic results. We match only the
        # full, unambiguous name in EN/RU/KZ.
        "match": [
            "astana it university",
            "astana it univ",
            "астана ит университет",
            "astana it-университет",
            "astana it университеті",
        ],
        "source_name": "Astana IT University",
        "site_host": "astanait.edu.kz",
        "listing_pages": [
            "https://astanait.edu.kz/en",
            "https://astanait.edu.kz/ru",
            "https://astanait.edu.kz/kz",
        ],
        # AITU news are plain slugs like /en/<slug>; static pages share the
        # same shape, so we blacklist the known non-news slugs instead of
        # whitelisting paths.
        "exclude_slugs": {
            "", "about-us", "about-uni", "about-aitu", "bachelor", "master",
            "phd", "college", "contacts", "vacancies", "early-admission",
            "licenses-accreditations", "rector-blog", "alumni-association",
            "university-structure", "aitu-ecosystem-and-infrastructure",
            "inc-academ-mobility", "outg-academ-mobility",
        },
        # External media coverage ("Media About Us") whose URL mentions the
        # entity is pulled in too — that's real third-party news about AITU.
        # Keep these specific (not bare "aitu") to avoid false positives like
        # yuujiso.github.io/aitumap.
        "media_keywords": [
            "astana-it-university", "astana_it_university", "astana-it-univ",
        ],
        "country": "KZ",
        # Per-article reach for the university's OWN site. A niche .edu site
        # gets far less traffic than national news portals (Tengrinews /
        # Kazinform sit around ~800-1000 reach/article), so keep this clearly
        # lower and realistic rather than the old inflated 50000.
        "reach": 350,
    },
]
OFFICIAL_SITE_MAX_ARTICLES = 20


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _friendly_stage(label: str) -> str:
    """Map an internal step label to a human-readable source name shown in
    the ingestion progress UI ("which source are we scanning now")."""
    low = (label or "").lower()
    if low.startswith("newsapi"):
        return "NewsAPI"
    if low.startswith("serpapi"):
        return "Google (SerpAPI)"
    if low.startswith("newsdata"):
        return "NewsData.io"
    if low.startswith("eventregistry"):
        return "Event Registry"
    if low.startswith("worldnews"):
        return "World News API"
    if low.startswith("gnews"):
        return "Google News"
    if low.startswith("gdelt"):
        return "GDELT (global)"
    if low.startswith("official"):
        return "Official website"
    return label or "source"




# ---------------------------------------------------------------------------
# Multi-keyword query helpers
# ---------------------------------------------------------------------------

def _normalize_terms(values: list[str] | str | None) -> list[str]:
    """Clean / dedupe a list of search terms while preserving order.

    Accepts list[str] or comma-separated string. Single tokens shorter than
    2 characters are dropped (too noisy). Multi-word phrases are kept intact.
    """
    out: list[str] = []
    seen: set[str] = set()
    if values is None:
        return out
    if isinstance(values, str):
        raw_iter = values.split(",")
    else:
        raw_iter = list(values)
    for raw in raw_iter:
        v = str(raw).strip()
        if not v:
            continue
        # Single tokens too short are skipped; phrases pass through.
        if " " not in v and len(v) < 2:
            continue
        key = v.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(v)
    return out


def _build_or_query(main: str, aliases: list[str], max_terms: int = 8) -> str:
    """Build an ``OR`` search expression from a main topic and aliases.

    Used as ``q`` for NewsAPI/NewsData/SerpAPI/EventRegistry/WorldNewsAPI —
    they all accept ``term1 OR term2 OR ...``. Quoted phrases are wrapped in
    double quotes so multi-word entities stay together.
    """
    terms = _normalize_terms([main] + (aliases or []))
    if not terms:
        return ""
    # Cap to keep the URL/payload small for SerpAPI / NewsData free tiers.
    terms = terms[:max_terms]

    def _quote(t: str) -> str:
        return f'"{t}"' if " " in t and not (t.startswith('"') and t.endswith('"')) else t

    parts = [_quote(t) for t in terms]
    return " OR ".join(parts)


# ---------------------------------------------------------------------------
# Public helpers (used by routes, dispatcher, etc.)
# ---------------------------------------------------------------------------

async def create_crawl_job(
    db: AsyncSession,
    project_id: str,
    source_id: str | None = None,
    created_by: str | None = None,
    job_type: str = "refresh_project_mentions",
    status: str = "pending",
    idempotency_key: str | None = None,
) -> CrawlJob:
    job = CrawlJob(
        project_id=project_id,
        source_id=source_id,
        created_by=created_by,
        job_type=job_type,
        status=status,
        idempotency_key=idempotency_key,
    )
    db.add(job)
    await db.flush()
    return job


async def get_project_jobs(db: AsyncSession, project_id: str, limit: int = 30) -> list[CrawlJob]:
    rows = await db.execute(
        select(CrawlJob)
        .where(CrawlJob.project_id == project_id)
        .order_by(CrawlJob.created_at.desc())
        .limit(max(1, int(limit))),
    )
    return list(rows.scalars().all())


async def get_job_by_id(db: AsyncSession, project_id: str, job_id: str) -> CrawlJob | None:
    row = await db.execute(
        select(CrawlJob).where(CrawlJob.id == job_id, CrawlJob.project_id == project_id),
    )
    return row.scalar_one_or_none()


async def get_ingestion_health(db: AsyncSession, project_id: str | None = None) -> dict:
    base = select(CrawlJob.status, func.count(CrawlJob.id)).group_by(CrawlJob.status)
    if project_id:
        base = base.where(CrawlJob.project_id == project_id)
    rows = (await db.execute(base)).all()
    counts = {status: int(count) for status, count in rows}
    return {
        "pending": counts.get("pending", 0),
        "running": counts.get("running", 0),
        "completed": counts.get("completed", 0),
        "failed": counts.get("failed", 0),
    }


# ---------------------------------------------------------------------------
# NewsAPI fetcher
# ---------------------------------------------------------------------------

async def _fetch_newsapi(
    client: httpx.AsyncClient,
    query: str,
    language: str | None = None,
    page: int = 1,
    page_size: int | None = None,
    from_date: str | None = None,
    domains: str | None = None,
) -> list[dict]:
    api_key = settings.NEWS_API_KEY
    if not api_key:
        logger.warning("NEWS_API_KEY is not set – skipping NewsAPI fetch")
        return []

    effective_page_size = page_size or settings.NEWS_API_PAGE_SIZE or 100
    if not from_date:
        from_date = (_utcnow() - timedelta(days=LOOKBACK_DAYS)).strftime("%Y-%m-%d")

    params = {
        "q": query,
        "from": from_date,
        "sortBy": "publishedAt",
        "pageSize": min(effective_page_size, 100),
        "page": page,
        "apiKey": api_key,
    }
    # Either filter by language (global) or by KZ domains (no language so all
    # languages from those outlets are returned).
    if domains:
        params["domains"] = domains
    elif language:
        params["language"] = language

    label = domains or language or "all"
    try:
        resp = await client.get(NEWS_API_BASE, params=params)
        if resp.status_code != 200:
            logger.error("NewsAPI %s responded %d: %s", label, resp.status_code, resp.text[:500])
            return []
        data = resp.json()
        if data.get("status") != "ok":
            logger.error("NewsAPI error: %s", data.get("message", "unknown"))
            return []
        return data.get("articles") or []
    except Exception as exc:
        logger.error("NewsAPI request failed: %s", exc)
        return []


# ---------------------------------------------------------------------------
# SerpAPI fetcher (Google News results)
# ---------------------------------------------------------------------------

async def _fetch_serpapi(
    client: httpx.AsyncClient,
    query: str,
    hl: str = "en",
    gl: str = "kz",
    location: str | None = None,
) -> list[dict]:
    api_key = settings.SERP_API_KEY
    if not api_key:
        logger.warning("SERP_API_KEY is not set – skipping SerpAPI fetch")
        return []

    params: dict[str, str | int] = {
        "engine": "google",
        "q": query,
        "tbm": "nws",
        "hl": hl,
        "gl": gl,
        "num": 100,
        "api_key": api_key,
    }
    # Only send location when present; an invalid location string would make
    # SerpAPI reject the request, while gl=kz alone still biases to KZ.
    if location:
        params["location"] = location

    try:
        resp = await client.get(SERP_API_BASE, params=params, timeout=30)
        if resp.status_code != 200:
            logger.error("SerpAPI %s/%s responded %d: %s", hl, gl, resp.status_code, resp.text[:500])
            return []
        data = resp.json()
        raw_results = data.get("news_results") or data.get("organic_results") or []
        articles: list[dict] = []
        for item in raw_results:
            link = str(item.get("link") or "").strip()
            if not link:
                continue
            title = str(item.get("title") or "").strip()
            snippet = str(item.get("snippet") or "").strip()
            source_name = str(item.get("source") or "").strip()
            date_str = str(item.get("date") or "").strip()
            thumbnail = str(item.get("thumbnail") or "").strip()
            articles.append({
                "url": link,
                "title": title,
                "description": snippet,
                "content": snippet,
                "author": "",
                "urlToImage": thumbnail,
                "publishedAt": date_str,
                "source": {"name": source_name},
            })
        return articles
    except Exception as exc:
        logger.error("SerpAPI request failed: %s", exc)
        return []


# ---------------------------------------------------------------------------
# Google News RSS fetcher (free, no API key, best Kazakhstan coverage)
# ---------------------------------------------------------------------------

def _strip_html(text: str) -> str:
    """Strip HTML tags from a snippet. Google News puts <a href>… markup in
    the RSS <description>; we only want the plain text."""
    if not text:
        return ""
    try:
        from bs4 import BeautifulSoup

        return BeautifulSoup(text, "html.parser").get_text(" ", strip=True)
    except Exception:
        # Defensive fallback — naive tag removal.
        import re

        return re.sub(r"<[^>]+>", " ", text).strip()


def _split_gnews_title(raw_title: str) -> tuple[str, str]:
    """Google News appends the publisher to the title as ``Headline - Source``.
    Return ``(headline, source_name)`` splitting on the last ` - `.
    """
    title = (raw_title or "").strip()
    if " - " in title:
        head, _, tail = title.rpartition(" - ")
        # Only treat the tail as a source if it's reasonably short (a name,
        # not part of the headline).
        if head and tail and len(tail) <= 60:
            return head.strip(), tail.strip()
    return title, ""


async def _fetch_google_news_rss(
    client: httpx.AsyncClient,
    query: str,
    hl: str = "ru",
    gl: str = "KZ",
    ceid: str = "KZ:ru",
) -> list[dict]:
    """Fetch articles from Google News RSS for a given edition.

    Free, key-less and unlimited. Google News aggregates Kazakhstan media
    that the paid free-tier APIs miss. Returns the same article dict shape
    as the other fetchers so ``_process_article`` works unchanged.
    """
    if not query.strip():
        return []

    params = {"q": query, "hl": hl, "gl": gl, "ceid": ceid}
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
        )
    }

    try:
        # follow_redirects is required: Google News answers the first request
        # with a 302 to a geo/consent-resolved RSS URL.
        resp = await client.get(
            GOOGLE_NEWS_BASE,
            params=params,
            headers=headers,
            timeout=30,
            follow_redirects=True,
        )
        if resp.status_code != 200:
            logger.error(
                "Google News %s responded %d: %s",
                ceid, resp.status_code, resp.text[:300],
            )
            return []

        import feedparser

        feed = feedparser.parse(resp.content)
        articles: list[dict] = []
        for entry in feed.entries:
            link = str(getattr(entry, "link", "") or "").strip()
            if not link:
                continue
            headline, title_source = _split_gnews_title(
                str(getattr(entry, "title", "") or "")
            )
            if not headline:
                continue

            # Real publisher name: prefer the <source> tag, fall back to the
            # name parsed off the title suffix.
            source_name = ""
            src = getattr(entry, "source", None)
            if src is not None:
                source_name = str(getattr(src, "title", "") or "").strip()
            if not source_name:
                source_name = title_source

            summary = _strip_html(str(getattr(entry, "summary", "") or ""))
            published = str(
                getattr(entry, "published", "")
                or getattr(entry, "updated", "")
                or ""
            ).strip()

            articles.append({
                "url": link,
                "title": headline,
                "description": summary,
                "content": summary,
                "author": "",
                "urlToImage": "",
                "publishedAt": published,
                "source": {"name": source_name},
                # Kazakhstan-focused edition → attribute geo to KZ so the
                # geo analytics reflect local coverage.
                "_country": "KZ",
            })

        logger.info("Google News %s fetched %d articles", ceid, len(articles))
        return articles
    except Exception as exc:
        logger.error("Google News request failed (%s): %s", ceid, exc)
        return []


# ---------------------------------------------------------------------------
# GDELT DOC 2.0 fetcher (free, key-less, global news in 100+ languages)
# ---------------------------------------------------------------------------

# Process-wide spacing so we respect GDELT's ~1 request / 5 s limit even when
# two jobs run concurrently.
_gdelt_lock: asyncio.Lock | None = None
_gdelt_next_allowed = 0.0


def _get_gdelt_lock() -> asyncio.Lock:
    global _gdelt_lock
    if _gdelt_lock is None:
        _gdelt_lock = asyncio.Lock()
    return _gdelt_lock


def _build_gdelt_query(topic: str, aliases: list[str]) -> str:
    """GDELT query: quoted phrases joined by OR inside parentheses."""
    terms = _normalize_terms([topic] + (aliases or []))[:8]
    if not terms:
        return ""
    parts = [f'"{t}"' if " " in t else t for t in terms]
    return "(" + " OR ".join(parts) + ")"


async def _fetch_gdelt(client: httpx.AsyncClient, query: str) -> list[dict]:
    """Fetch global news articles from the GDELT DOC 2.0 API.

    Returns the standard article dict shape. GDELT only provides title +
    metadata (no body), so sentiment is computed from the headline — same as
    the Google News RSS source. Free and key-less; we self-throttle to respect
    GDELT's rate limit and treat 429 as "no results this run".
    """
    if not query.strip():
        return []

    params = {
        "query": query,
        "mode": "artlist",
        "format": "json",
        "maxrecords": GDELT_MAX_RECORDS,
        "sort": "datedesc",
        "timespan": f"{max(1, LOOKBACK_DAYS)}d",
    }
    headers = {"User-Agent": _BROWSER_UA}

    try:
        # Self-throttle process-wide to stay under ~1 req / 5 s.
        async with _get_gdelt_lock():
            global _gdelt_next_allowed
            wait = _gdelt_next_allowed - time.monotonic()
            if wait > 0:
                await asyncio.sleep(min(wait, GDELT_MIN_INTERVAL_SECONDS))
            resp = await client.get(
                GDELT_DOC_BASE, params=params, headers=headers,
                timeout=30, follow_redirects=True,
            )
            _gdelt_next_allowed = time.monotonic() + GDELT_MIN_INTERVAL_SECONDS

        if resp.status_code != 200:
            logger.warning("GDELT responded %d: %s", resp.status_code, resp.text[:160])
            return []
        try:
            data = resp.json()
        except Exception:
            logger.warning("GDELT returned non-JSON (likely throttled)")
            return []

        articles: list[dict] = []
        for item in data.get("articles") or []:
            url = str(item.get("url") or "").strip()
            title = str(item.get("title") or "").strip()
            if not url or not title:
                continue
            domain = str(item.get("domain") or "").strip()
            seen = str(item.get("seendate") or "").strip()
            published = seen
            try:
                # GDELT format: 20260607T030000Z -> ISO 8601.
                dt = datetime.strptime(seen, "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc)
                published = dt.isoformat()
            except Exception:
                published = _utcnow().isoformat()
            country_code = nlp_service.normalize_country(item.get("sourcecountry") or "")
            if country_code == "XX":
                country_code = ""
            articles.append({
                "url": url,
                "title": title,
                "description": title,
                "content": title,
                "author": "",
                "urlToImage": str(item.get("socialimage") or "").strip(),
                "publishedAt": published,
                "source": {"name": domain or "GDELT"},
                "_country": country_code,
            })
        logger.info("GDELT fetched %d articles", len(articles))
        return articles
    except Exception as exc:
        logger.warning("GDELT request failed: %s", exc)
        return []


# ---------------------------------------------------------------------------
# Official site crawler (entity's own website, e.g. astanait.edu.kz)
# ---------------------------------------------------------------------------

_BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)


def _match_official_site(topic: str, aliases: list[str]) -> dict | None:
    """Return the registry entry whose trigger phrases match the project's
    topic or aliases, else None."""
    haystack = [(topic or "").strip().lower()]
    haystack += [(a or "").strip().lower() for a in (aliases or [])]
    haystack = [h for h in haystack if h]
    for entry in OFFICIAL_SITE_REGISTRY:
        for phrase in entry["match"]:
            p = phrase.lower()
            for h in haystack:
                # Exact or containment either direction so "AITU" matches
                # "aitu" and "astana it university" matches the topic.
                if p == h or p in h or h in p:
                    return entry
    return None


def _accept_official_url(url: str, entry: dict) -> bool:
    """Decide if a discovered URL is an article worth fetching.

    Two cases:
      1. Internal page on the entity's host: a ``/<lang>/<slug>`` path whose
         slug is NOT in the static-page blacklist (about-us, bachelor, …).
      2. External media coverage: a third-party URL that mentions the entity
         (e.g. finratings.kz/...astana-it-university..., kazpravda.kz/...).
    Binary files are always rejected.
    """
    from urllib.parse import urlparse

    low = url.lower()
    if low.endswith(
        (".pdf", ".doc", ".docx", ".xls", ".xlsx", ".jpg", ".jpeg",
         ".png", ".gif", ".zip", ".rar")
    ):
        return False

    site_host = (entry.get("site_host") or "").lower()
    host = urlparse(url).netloc.lower().removeprefix("www.")
    path = urlparse(url).path.strip("/")

    if site_host and host == site_host:
        # Internal: expect <lang>/<slug>. Reject language roots and static
        # pages, and require a real slug segment.
        parts = [p for p in path.split("/") if p]
        if len(parts) < 2:
            return False
        lang = parts[0].lower()
        if lang not in {"en", "ru", "kz", "kk"}:
            return False
        slug = parts[1].lower().strip()
        exclude = entry.get("exclude_slugs") or set()
        if slug in exclude or len(slug) < 4:
            return False
        return True

    # External media coverage about the entity.
    keywords = entry.get("media_keywords") or []
    if keywords and any(kw in low for kw in keywords):
        return True
    return False


def _extract_title(soup) -> str:
    """Best-effort article title from <h1>, og:title, or <title>."""
    h1 = soup.find("h1")
    if h1:
        txt = h1.get_text(" ", strip=True)
        if txt and len(txt) >= 5:
            return txt[:500]
    og = soup.find("meta", attrs={"property": "og:title"})
    if og and og.get("content"):
        return str(og["content"]).strip()[:500]
    if soup.title and soup.title.string:
        return str(soup.title.string).strip()[:500]
    return ""


def _extract_published(soup) -> str:
    """Best-effort publication date string for _parse_date."""
    # <meta property="article:published_time"> / og:published_time
    for attr in ("article:published_time", "og:published_time"):
        m = soup.find("meta", attrs={"property": attr})
        if m and m.get("content"):
            return str(m["content"]).strip()
    # <time datetime="...">
    t = soup.find("time")
    if t:
        if t.get("datetime"):
            return str(t["datetime"]).strip()
        txt = t.get_text(" ", strip=True)
        if txt:
            return txt
    return ""


async def _fetch_official_site(
    client: httpx.AsyncClient,
    entry: dict,
) -> list[dict]:
    """Crawl an entity's official website for news articles.

    Strategy: crawl the listing pages (/en, /ru, /kz), collect both internal
    news slugs and external "Media About Us" links that mention the entity,
    then fetch each detail page and parse it into the standard article dict.
    Marked ``_is_official=True`` so it bypasses the keyword relevance filter
    (content is guaranteed about the entity).
    """
    from bs4 import BeautifulSoup
    from urllib.parse import urljoin

    from app.services.extractors import extract_article_text

    headers = {"User-Agent": _BROWSER_UA}
    article_urls: list[str] = []
    seen: set[str] = set()
    # url -> publication date string parsed from the listing card (the detail
    # pages expose no machine-readable date, but each listing card shows one
    # like "June 4, 2026").
    date_map: dict[str, str] = {}
    _date_re = re.compile(
        r"(January|February|March|April|May|June|July|August|September|"
        r"October|November|December)\s+\d{1,2},?\s*\d{4}"
    )

    for page in entry.get("listing_pages") or []:
        try:
            resp = await client.get(
                page, headers=headers, timeout=12, follow_redirects=True
            )
            if resp.status_code != 200:
                continue
            soup = BeautifulSoup(resp.text, "html.parser")
            for a in soup.find_all("a", href=True):
                href = (a.get("href") or "").strip()
                if not href or href.startswith(("mailto:", "tel:", "#", "javascript:")):
                    continue
                u = urljoin(page, href).split("#")[0].rstrip("/")
                if u and u not in seen and _accept_official_url(u, entry):
                    seen.add(u)
                    article_urls.append(u)
                    # The real publication date lives in the card, inside the
                    # <a>: a small pill <span>…June 4, 2026</span> before <h3>.
                    m = _date_re.search(a.get_text(" ", strip=True))
                    if m:
                        date_map[u] = m.group(0)
        except Exception as exc:
            logger.warning("Official listing fetch failed (%s): %s", page, exc)

    article_urls = article_urls[:OFFICIAL_SITE_MAX_ARTICLES]
    if not article_urls:
        logger.info("Official site %s: no article URLs discovered", entry.get("source_name"))
        return []

    # ── 3) Fetch each detail page → article dict
    articles: list[dict] = []
    for url in article_urls:
        try:
            resp = await client.get(
                url, headers=headers, timeout=12, follow_redirects=True
            )
            if resp.status_code != 200:
                continue
            html = resp.text
            soup = BeautifulSoup(html, "html.parser")
            title = _extract_title(soup)
            body = extract_article_text(html)
            # Skip thin pages (nav stubs, JS-only shells) — need real content.
            if len(body) < 150:
                continue
            # Many SPA pages share one generic <title>; derive a real headline
            # from the slug / first sentence of the body in that case.
            generic = (entry.get("source_name") or "").strip().lower()
            if not title or title.strip().lower() == generic:
                first = body.split(". ")[0].split("\n")[0].strip()
                if 8 <= len(first) <= 160:
                    title = first
                else:
                    slug = url.rstrip("/").rsplit("/", 1)[-1].replace("-", " ").replace("_", " ")
                    title = slug.title()[:160] or generic.title()
            # Prefer the date parsed from the listing card; fall back to any
            # date in the detail page, then to now().
            published = date_map.get(url) or _extract_published(soup)
            articles.append({
                "url": url,
                "title": title or (body[:120] if body else ""),
                "description": body[:1000],
                "content": body,
                "author": "",
                "urlToImage": "",
                "publishedAt": published or _utcnow().isoformat(),
                "source": {"name": entry["source_name"]},
                "_country": entry.get("country", "KZ"),
                "_reach": entry.get("reach", 0),
                "_is_official": True,
            })
        except Exception as exc:
            logger.warning("Official article fetch failed (%s): %s", url[:100], exc)
            continue

    logger.info(
        "Official site %s fetched %d articles",
        entry.get("source_name"), len(articles),
    )
    return articles


# ---------------------------------------------------------------------------
# NewsData.io fetcher
# ---------------------------------------------------------------------------

async def _fetch_newsdata(
    client: httpx.AsyncClient,
    query: str,
    language: str = "en",
) -> list[dict]:
    api_key = settings.NEWSDATA_API_KEY
    if not api_key:
        logger.warning("NEWSDATA_API_KEY is not set – skipping NewsData.io fetch")
        return []

    params = {
        "apikey": api_key,
        "q": query,
        "language": language,
        "removeduplicate": 1,
        "size": 10,
    }

    try:
        resp = await client.get(NEWSDATA_API_BASE, params=params, timeout=30)
        if resp.status_code != 200:
            logger.error("NewsData.io %s responded %d: %s", language, resp.status_code, resp.text[:500])
            return []
        data = resp.json()
        if data.get("status") != "success":
            logger.error("NewsData.io error: %s", data.get("message", "unknown"))
            return []
        raw_results = data.get("results") or []
        articles: list[dict] = []
        for item in raw_results:
            link = str(item.get("link") or "").strip()
            if not link:
                continue
            title = str(item.get("title") or "").strip()
            if not title or title == "[Removed]":
                continue
            description = str(item.get("description") or "").strip()
            source_name = str(item.get("source_name") or item.get("source_id") or "").strip()
            pub_date = str(item.get("pubDate") or "").strip()
            image_url = str(item.get("image_url") or "").strip()
            creators = item.get("creator") or []
            author = creators[0] if isinstance(creators, list) and creators else ""

            country_list = item.get("country") or []
            raw_country = ""
            if isinstance(country_list, list) and country_list:
                raw_country = str(country_list[0]).strip()
            elif isinstance(country_list, str):
                raw_country = country_list.strip()

            articles.append({
                "url": link,
                "title": title,
                "description": description,
                "content": description,
                "author": str(author),
                "urlToImage": image_url,
                "publishedAt": pub_date,
                "source": {"name": source_name},
                "_country": raw_country,
            })
        return articles
    except Exception as exc:
        logger.error("NewsData.io request failed: %s", exc)
        return []


# ---------------------------------------------------------------------------
# Event Registry (NewsAPI.ai) fetcher
# ---------------------------------------------------------------------------

_ER_COUNTRY_LABEL_MAP: dict[str, str] = {
    "United States": "US", "United Kingdom": "GB", "Canada": "CA",
    "Australia": "AU", "Germany": "DE", "France": "FR", "Russia": "RU",
    "Kazakhstan": "KZ", "India": "IN", "Japan": "JP", "China": "CN",
    "Turkey": "TR", "Brazil": "BR", "Spain": "ES", "Italy": "IT",
}


async def _fetch_event_registry(
    client: httpx.AsyncClient,
    query: str,
    language: str | None = "eng",
    count: int = 100,
    source_location_uri: str | None = None,
) -> list[dict]:
    """Fetch articles from Event Registry / NewsAPI.ai.

    Endpoint accepts JSON via POST. Each item gives us a real publish date,
    source country and (often) social shares — so we map shares + socialScore
    into ``_reach`` so the ingestion pipeline can use it as actual reach.
    """
    api_key = settings.EVENT_REGISTRY_API_KEY
    if not api_key:
        logger.warning("EVENT_REGISTRY_API_KEY is not set – skipping Event Registry fetch")
        return []

    payload = {
        "action": "getArticles",
        "keyword": query,
        "articlesPage": 1,
        "articlesCount": min(count, 100),
        "articlesSortBy": "date",
        "articlesSortByAsc": False,
        "dataType": ["news", "pr"],
        "forceMaxDataTimeWindow": 31,
        "resultType": "articles",
        "apiKey": api_key,
        "articleBodyLen": -1,
    }
    if language:
        payload["lang"] = language
    # Restrict to publishers located in a given country/city (e.g. Kazakhstan)
    # regardless of language.
    if source_location_uri:
        payload["sourceLocationUri"] = source_location_uri

    label = source_location_uri or language or "all"
    try:
        resp = await client.post(EVENT_REGISTRY_API_BASE, json=payload, timeout=60)
        if resp.status_code != 200:
            logger.error(
                "EventRegistry %s responded %d: %s",
                label, resp.status_code, resp.text[:500],
            )
            return []
        data = resp.json()
        raw_articles = (data.get("articles") or {}).get("results") or []
        articles: list[dict] = []
        for item in raw_articles:
            url = str(item.get("url") or "").strip()
            if not url:
                continue
            title = str(item.get("title") or "").strip()
            if not title:
                continue
            body = str(item.get("body") or "").strip()
            published = (
                str(item.get("dateTime") or item.get("dateTimePub") or "").strip()
            )

            source_info = item.get("source") or {}
            source_name = str(source_info.get("title") or source_info.get("uri") or "").strip()

            country_code = ""
            loc = source_info.get("location") or {}
            if isinstance(loc, dict):
                country_obj = loc.get("country") or {}
                if isinstance(country_obj, dict):
                    label_obj = country_obj.get("label") or {}
                    label = ""
                    if isinstance(label_obj, dict):
                        label = str(label_obj.get("eng") or "").strip()
                    elif isinstance(label_obj, str):
                        label = label_obj.strip()
                    if label:
                        country_code = _ER_COUNTRY_LABEL_MAP.get(label) or nlp_service.normalize_country(label)
                        if country_code == "XX":
                            country_code = ""

            image_url = str(item.get("image") or "").strip()

            authors = item.get("authors") or []
            author_names: list[str] = []
            for a in authors[:3]:
                if isinstance(a, dict):
                    name = str(a.get("name") or "").strip()
                    if name:
                        author_names.append(name)
                elif isinstance(a, str) and a.strip():
                    author_names.append(a.strip())
            author = ", ".join(author_names)

            shares_count = 0
            shares_obj = item.get("shares")
            if isinstance(shares_obj, dict):
                for v in shares_obj.values():
                    try:
                        shares_count += int(v or 0)
                    except (TypeError, ValueError):
                        continue
            elif isinstance(shares_obj, (int, float)):
                shares_count = int(shares_obj)

            try:
                social_score = int(item.get("socialScore") or 0)
            except (TypeError, ValueError):
                social_score = 0

            real_reach = shares_count or social_score

            articles.append({
                "url": url,
                "title": title,
                "description": body[:500] if body else title,
                "content": body,
                "author": author,
                "urlToImage": image_url,
                "publishedAt": published,
                "source": {"name": source_name},
                "_country": country_code,
                "_reach": real_reach if real_reach > 0 else None,
            })
        logger.info("EventRegistry [%s]: fetched %d articles", language, len(articles))
        return articles
    except Exception as exc:
        logger.error("EventRegistry request failed: %s", exc)
        return []


# ---------------------------------------------------------------------------
# World News API (worldnewsapi.com) fetcher
# ---------------------------------------------------------------------------


def _hostname_for_display(url: str) -> str:
    try:
        host = (urlparse(url).netloc or "").lower()
        if host.startswith("www."):
            host = host[4:]
        return host or "News"
    except Exception:
        return "News"


async def _fetch_world_news(
    client: httpx.AsyncClient,
    query: str,
    variant: dict[str, str],
    number: int = 50,
) -> list[dict]:
    """Fetch articles from World News API with one of the language/country variants.

    Maps response into the common article dict, including ``_country`` from
    ``source_country`` so the ingestion country logic can use it.
    """
    api_key = settings.WORLD_NEWS_API_KEY
    if not api_key:
        logger.warning("WORLD_NEWS_API_KEY is not set – skipping World News API fetch")
        return []

    params: dict[str, str | int] = {
        "api-key": api_key,
        "text": query,
        "number": min(max(1, number), 100),
    }
    params.update(variant)

    try:
        resp = await client.get(WORLD_NEWS_API_BASE, params=params, timeout=60)
        if resp.status_code != 200:
            logger.error(
                "WorldNewsAPI %s responded %d: %s",
                variant, resp.status_code, resp.text[:500],
            )
            return []
        data = resp.json()
        raw_news = data.get("news") or []
        articles: list[dict] = []
        for item in raw_news:
            url = str(item.get("url") or "").strip()
            if not url:
                continue
            title = str(item.get("title") or "").strip()
            if not title:
                continue
            summary = str(item.get("summary") or "").strip()
            text_body = str(item.get("text") or "").strip()
            content = text_body or summary
            description = summary or (content[:500] if content else "")
            pub = str(item.get("publish_date") or "").strip()
            image_url = str(item.get("image") or "").strip()

            authors = item.get("authors") or []
            if isinstance(authors, list):
                author = ", ".join(str(a).strip() for a in authors if str(a).strip())
            else:
                author = str(authors).strip() if authors else ""

            src_country_raw = str(item.get("source_country") or "").strip()
            country_code = nlp_service.normalize_country(src_country_raw) if src_country_raw else ""
            if country_code == "XX":
                country_code = ""

            articles.append({
                "url": url,
                "title": title,
                "description": description,
                "content": content,
                "author": author,
                "urlToImage": image_url,
                "publishedAt": pub,
                "source": {"name": _hostname_for_display(url)},
                "_country": country_code,
            })
        logger.info("WorldNewsAPI %s: fetched %d articles", variant, len(articles))
        return articles
    except Exception as exc:
        logger.error("WorldNewsAPI request failed: %s", exc)
        return []


# ---------------------------------------------------------------------------
# Main ingestion entry-point
# ---------------------------------------------------------------------------

async def run_project_ingestion(
    db: AsyncSession,
    project_id: str,
    crawl_job_id: str,
    created_by: str | None = None,
    limit_sources: int | None = None,
    per_source_limit: int = 30,
) -> CrawlJob:
    del created_by, limit_sources, per_source_limit
    job = await _mark_job_running(db, crawl_job_id)
    try:
        project = (
            await db.execute(select(Project).where(Project.id == project_id))
        ).scalar_one_or_none()
        if not project:
            raise ValueError(f"Project not found: {project_id}")

        proj_settings = dict(project.settings or {})
        topic_query = str(proj_settings.get("topicQuery") or project.name or "")
        if not topic_query.strip():
            raise ValueError("Project has no topic/query to search")

        # Optional list of synonyms / variants — UI: "additional keywords" textarea.
        # Stored as `aliases` (preferred) or backwards-compat `keywords` minus the
        # main topic.
        aliases_raw = proj_settings.get("aliases") or proj_settings.get("keywords") or []
        if isinstance(aliases_raw, str):
            aliases_list = [a.strip() for a in aliases_raw.split(",")]
        else:
            aliases_list = [str(a) for a in aliases_raw]
        aliases_list = [a for a in aliases_list if a and a.strip().lower() != topic_query.strip().lower()]

        # Known-entity official website (e.g. astanait.edu.kz) — crawled in
        # addition to the API providers when the topic matches the registry.
        official_entry = _match_official_site(topic_query, aliases_list)

        # For a recognised entity, automatically broaden the search with its
        # known aliases (RU/KZ names, acronyms like "AITU"). This dramatically
        # increases coverage from the external news APIs: most local coverage
        # of e.g. Astana IT University is in Russian/Kazakh or uses "AITU",
        # which a single English phrase would never match.
        if official_entry:
            for alias in official_entry.get("match", []):
                a = (alias or "").strip()
                if a and a.lower() != topic_query.strip().lower() \
                        and a.lower() not in {x.lower() for x in aliases_list}:
                    aliases_list.append(a)

        # Drop generic single-word fragments of the main topic (e.g. for
        # "Astana IT University" the UI auto-creates keywords "Astana" and
        # "University"). On their own these match unrelated articles ("Air
        # Astana", "University of Arizona"), so they must NOT be standalone
        # relevance/search terms. Multi-word aliases and distinct acronyms
        # (e.g. "AITU") are kept.
        _main_tokens = {tok for tok in re.split(r"\W+", topic_query.lower()) if tok}

        def _is_topic_fragment(term: str) -> bool:
            toks = [t for t in re.split(r"\W+", term.lower()) if t]
            return len(toks) == 1 and toks[0] in _main_tokens

        aliases_list = [a for a in aliases_list if not _is_topic_fragment(a)]

        # Search query that asks each provider for either the main topic
        # or any of the aliases. Falls back to plain topic when no aliases.
        search_query = _build_or_query(topic_query, aliases_list) or topic_query
        all_terms_lower = [t.lower() for t in _normalize_terms([topic_query] + aliases_list)]
        logger.info(
            "Project %s search query: %r (aliases=%d)",
            project_id, search_query, len(aliases_list),
        )

        gdelt_query = _build_gdelt_query(topic_query, aliases_list)

        total_steps = (
            len(NEWS_API_VARIANTS)
            + len(SERP_LANGUAGES)
            + len(NEWSDATA_LANGUAGES)
            + len(EVENT_REGISTRY_VARIANTS)
            + len(WORLD_NEWS_VARIANTS)
            + len(GOOGLE_NEWS_VARIANTS)
            + (1 if gdelt_query else 0)
            + (1 if official_entry else 0)
        )
        await job_progress_service.start_job(job.id, total_sources=total_steps)

        fetched_total = 0
        saved_total = 0
        dedup_total = 0
        _job_start = time.monotonic()
        _step_no = 0  # completed provider steps so far (drives live progress)

        # Mentions saved in the current provider step that still need an
        # embedding + topic assignment. Drained between providers so one
        # OpenAI batch request covers the whole step.
        pending_post: list[Mention] = []

        async def _safe_process(
            article: dict,
            precomputed_nlp: tuple[str, float, dict] | None = None,
        ) -> tuple[bool, bool]:
            """Wrap _process_article so a single bad article never aborts the job.

            Catches transient DB / NLP / network errors and rolls back the
            failed sub-transaction so the next article can proceed.
            """
            try:
                return await _process_article(
                    db=db, project=project, article=article,
                    search_terms=all_terms_lower, pending_post=pending_post,
                    precomputed_nlp=precomputed_nlp,
                )
            except Exception as exc:
                logger.warning(
                    "Skipping article %r due to error: %s",
                    str(article.get("url", ""))[:100], exc,
                )
                try:
                    await db.rollback()
                except Exception:
                    pass
                return False, False

        async def _precompute_nlp(articles: list[dict]) -> dict[int, tuple]:
            """Run the per-article sentiment+emotions GPT calls CONCURRENTLY
            (bounded), with no DB access, so they don't serialize the whole
            ingestion step. Returns {index: (label, score, emotions)}."""
            sem = asyncio.Semaphore(8)
            results: dict[int, tuple] = {}

            async def _one(idx: int, article: dict) -> None:
                title = str(article.get("title") or "").strip()
                description = str(article.get("description") or "").strip()
                content = str(article.get("content") or "").strip()
                body = content or description
                full_text = f"{title}\n{body}".strip()
                if not full_text:
                    return
                async with sem:
                    try:
                        results[idx] = await nlp_service.score_sentiment_and_emotions_gpt(full_text)
                    except Exception:
                        pass

            if articles:
                await asyncio.gather(*[_one(i, a) for i, a in enumerate(articles)])
            return results

        async def _process_batch(articles: list[dict], label: str = "") -> None:
            """Process one provider step: concurrent NLP pre-pass, then the
            sequential DB writes (single shared session). Advancing the job
            counter is handled by ``_run_step`` so it happens exactly once per
            step even on timeout/error."""
            nonlocal fetched_total, dedup_total, saved_total
            # Cap how many articles a single source can contribute so one
            # high-volume provider can't make the job take minutes.
            if len(articles) > MAX_ARTICLES_PER_SOURCE:
                articles = articles[:MAX_ARTICLES_PER_SOURCE]
            fetched_total += len(articles)
            nlp_results = await _precompute_nlp(articles)
            for idx, article in enumerate(articles):
                is_dup, created = await _safe_process(article, nlp_results.get(idx))
                if is_dup:
                    dedup_total += 1
                if created:
                    saved_total += 1
            # Persist this step's mentions immediately so (a) they're visible
            # in the UI as each source completes and (b) the best-effort
            # enrichment below can NEVER roll them back.
            try:
                await db.commit()
            except Exception as exc:
                logger.warning("step commit failed (%s): %s", label, exc)
                try:
                    await db.rollback()
                except Exception:
                    pass
                pending_post.clear()
                return
            await _flush_pending_post()

        async def _publish_live_progress() -> None:
            """Persist the running counters + step so the UI shows growing
            numbers in real time (not 0/0/0 until the end)."""
            try:
                await db.commit()
            except Exception:
                try:
                    await db.rollback()
                except Exception:
                    pass
            await job_progress_service.update_progress(
                job.id,
                processed=_step_no,
                fetched=fetched_total,
                saved=saved_total,
                deduplicated=dedup_total,
            )

        async def _run_step(label: str, fetch_awaitable) -> None:
            """Run ONE provider step (fetch + process) with a hard wall-clock
            budget. Guarantees the step can never hang the job: on timeout or
            error we roll back the session and still advance progress. Also
            honours the overall job deadline so the whole run is bounded.

            Publishes the current source name BEFORE the (possibly slow) fetch
            and the live counters AFTER, so the UI always reflects real-time
            activity.
            """
            nonlocal _step_no
            # Tell the UI which source we're scanning right now.
            await job_progress_service.update_progress(job.id, stage=_friendly_stage(label))

            if (time.monotonic() - _job_start) > MAX_JOB_SECONDS:
                logger.warning("Job budget exceeded — skipping step %s", label)
                try:
                    fetch_awaitable.close()  # avoid "coroutine never awaited"
                except Exception:
                    pass
            else:
                try:
                    articles = await asyncio.wait_for(
                        fetch_awaitable, timeout=PER_SOURCE_TIME_BUDGET_SECONDS
                    )
                    await asyncio.wait_for(
                        _process_batch(articles, label=label),
                        timeout=PER_SOURCE_TIME_BUDGET_SECONDS,
                    )
                except asyncio.TimeoutError:
                    logger.warning("Step %s exceeded %ss budget — skipping",
                                   label, PER_SOURCE_TIME_BUDGET_SECONDS)
                    try:
                        await db.rollback()
                    except Exception:
                        pass
                except Exception as exc:
                    logger.warning("Step %s failed: %s — skipping", label, exc)
                    try:
                        await db.rollback()
                    except Exception:
                        pass

            _step_no += 1
            await _publish_live_progress()

        async def _flush_pending_post() -> None:
            """Best-effort enrichment (embeddings + topic assignment) for the
            mentions saved in the last step.

            Runs in its OWN throwaway DB session so that a failure here (e.g.
            a pgvector/driver error) can never corrupt the main ingestion
            session or stall the job. The mentions themselves are already
            committed by ``_process_batch`` before this runs.
            """
            if not pending_post:
                return
            ids = [m.id for m in pending_post]
            pending_post.clear()

            from app.database import AsyncSessionLocal
            from app.services import embedding_service, topic_service
            try:
                async with AsyncSessionLocal() as side:
                    rows = (
                        await side.execute(select(Mention).where(Mention.id.in_(ids)))
                    ).scalars().all()
                    if not rows:
                        return
                    try:
                        await embedding_service.embed_and_store_mentions_batch(side, rows)
                    except Exception as exc:
                        logger.warning("embedding enrichment skipped: %s", exc)
                    for m in rows:
                        try:
                            topic_id = await topic_service.assign_to_best_topic(side, m)
                            if topic_id:
                                m.topic_id = topic_id
                        except Exception as exc:
                            logger.warning("topic assign skipped for %s: %s", m.id, exc)
                    try:
                        await side.commit()
                    except Exception as exc:
                        logger.warning("enrichment commit skipped: %s", exc)
                        try:
                            await side.rollback()
                        except Exception:
                            pass
            except Exception as exc:
                logger.warning("enrichment session failed: %s", exc)

        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            for na_variant in NEWS_API_VARIANTS:
                await _run_step(
                    f"newsapi:{na_variant}",
                    _fetch_newsapi(
                        client,
                        query=search_query,
                        language=na_variant.get("language"),
                        domains=na_variant.get("domains"),
                    ),
                )

            for serp_lang in SERP_LANGUAGES:
                await _run_step(
                    f"serpapi:{serp_lang['hl']}",
                    _fetch_serpapi(
                        client,
                        query=search_query,
                        hl=serp_lang["hl"],
                        gl=serp_lang["gl"],
                        location=serp_lang.get("location"),
                    ),
                )

            for nd_lang in NEWSDATA_LANGUAGES:
                await _run_step(
                    f"newsdata:{nd_lang}",
                    _fetch_newsdata(client, query=search_query, language=nd_lang),
                )

            for er_variant in EVENT_REGISTRY_VARIANTS:
                await _run_step(
                    f"eventregistry:{er_variant}",
                    _fetch_event_registry(
                        client,
                        query=search_query,
                        language=er_variant.get("lang"),
                        source_location_uri=er_variant.get("source_location"),
                    ),
                )

            for wn_variant in WORLD_NEWS_VARIANTS:
                await _run_step(
                    f"worldnews:{wn_variant}",
                    _fetch_world_news(client, query=search_query, variant=wn_variant),
                )

            # Google News RSS — free, key-less, best Kazakhstan coverage.
            for gn_variant in GOOGLE_NEWS_VARIANTS:
                await _run_step(
                    f"gnews:{gn_variant['ceid']}",
                    _fetch_google_news_rss(
                        client,
                        query=search_query,
                        hl=gn_variant["hl"],
                        gl=gn_variant["gl"],
                        ceid=gn_variant["ceid"],
                    ),
                )

            # GDELT — free global index (100+ languages); one broad request.
            if gdelt_query:
                await _run_step("gdelt", _fetch_gdelt(client, gdelt_query))

            # Official entity website (registry match) — guaranteed-relevant
            # news straight from the source (e.g. astanait.edu.kz).
            if official_entry:
                await _run_step(
                    "official_site",
                    _fetch_official_site(client, official_entry),
                )

        await recompute_project_metrics(db=db, project_id=project_id)

        # Commit outer transaction BEFORE the AI/insights step so the
        # mentions are visible to readers (frontend, RAG retrieval) even
        # if insight generation later fails or times out. Without this,
        # everything would stay in an uncommitted transaction until the
        # very end of _local_refresh, which delays visibility by minutes.
        await db.commit()

        # Auto-generate AI insights from the freshly ingested data.
        # Best-effort with a hard time cap inside the service itself.
        try:
            from app.services import insight_service  # local import to avoid cycles
            await asyncio.wait_for(
                insight_service.generate_insights_for_project(db, project_id),
                timeout=60,
            )
            await db.commit()
        except Exception as exc:
            logger.warning("Insight auto-generation skipped: %s", exc)
            try:
                await db.rollback()
            except Exception:
                pass

        await _finalize_job(
            job.id,
            started_at=job.started_at,
            failed=False,
            items_fetched=fetched_total,
            items_saved=saved_total,
            items_deduplicated=dedup_total,
        )
        await job_progress_service.finish_job(job.id, failed=False)
        return job
    except Exception as exc:
        await _finalize_job(
            job.id,
            started_at=getattr(job, "started_at", None),
            failed=True,
            items_fetched=fetched_total,
            items_saved=saved_total,
            items_deduplicated=dedup_total,
            error=str(exc),
        )
        await job_progress_service.finish_job(job.id, failed=True, error=str(exc))
        raise


async def run_source_ingestion(
    db: AsyncSession,
    source_id: str,
    crawl_job_id: str,
    created_by: str | None = None,
    per_source_limit: int = 30,
) -> CrawlJob:
    del created_by, per_source_limit
    job = await _mark_job_running(db, crawl_job_id)
    job.error = "Source-level ingestion is not used with NewsAPI mode"
    await _mark_job_completed(job)
    await db.flush()
    return job


# ---------------------------------------------------------------------------
# Analyze / recompute (kept as-is)
# ---------------------------------------------------------------------------

async def analyze_mention(
    db: AsyncSession,
    mention_id: str,
    crawl_job_id: str | None = None,
    created_by: str | None = None,
) -> Mention | None:
    del created_by
    if crawl_job_id:
        await _mark_job_running(db, crawl_job_id)
    mention = (
        await db.execute(select(Mention).where(Mention.id == mention_id))
    ).scalar_one_or_none()
    if not mention:
        return None
    text = f"{mention.title or ''}\n{mention.body or ''}".strip()
    sentiment_label, sentiment_score = nlp_service.score_sentiment(text)
    mention.sentiment_label = sentiment_label
    mention.sentiment_score = float(sentiment_score)
    mention.language = nlp_service.detect_language(text, fallback=mention.language or "ru")
    # Use GPT-based emotion scoring; the helper internally falls back to
    # the rule-based scorer if OpenAI is unavailable, so we never block
    # a re-analyse on a flaky network.
    try:
        mention.emotions = await nlp_service.score_emotions_gpt(text)
    except Exception as exc:
        logger.warning("emotion scoring failed for mention %s: %s", mention.id, exc)
        mention.emotions = nlp_service.emotion_scores(text)
    mention.entities = nlp_service.extract_entities(text)
    mention.tags = nlp_service.topic_tags(text, [])
    if crawl_job_id:
        job_obj = await get_job_by_id(db, mention.project_id, crawl_job_id)
        if job_obj:
            job_obj.items_fetched = 1
            job_obj.items_saved = 1
            await _mark_job_completed(job_obj)
    await db.flush()
    return mention


async def recompute_project_metrics(
    db: AsyncSession,
    project_id: str,
    crawl_job_id: str | None = None,
    created_by: str | None = None,
) -> dict:
    del created_by
    total_mentions = int(
        (await db.execute(select(func.count(Mention.id)).where(Mention.project_id == project_id))).scalar() or 0,
    )
    total_reach = int(
        (await db.execute(select(func.coalesce(func.sum(Mention.reach), 0)).where(Mention.project_id == project_id))).scalar() or 0,
    )
    pos_count = int(
        (await db.execute(
            select(func.count(Mention.id)).where(Mention.project_id == project_id, Mention.sentiment_label == "positive"),
        )).scalar() or 0,
    )
    neg_count = int(
        (await db.execute(
            select(func.count(Mention.id)).where(Mention.project_id == project_id, Mention.sentiment_label == "negative"),
        )).scalar() or 0,
    )
    positive_percentage = round((pos_count / total_mentions) * 100, 1) if total_mentions else 0.0
    negative_percentage = round((neg_count / total_mentions) * 100, 1) if total_mentions else 0.0
    presence_score = min(100.0, round((total_reach / 10000) * 10, 1)) if total_reach else 0.0

    project = (await db.execute(select(Project).where(Project.id == project_id))).scalar_one_or_none()
    metrics = {
        "total_mentions": total_mentions,
        "total_reach": total_reach,
        "positive_percentage": positive_percentage,
        "negative_percentage": negative_percentage,
        "presence_score": presence_score,
    }
    if project:
        s = dict(project.settings or {})
        s["computed_metrics"] = metrics
        project.settings = s
    if crawl_job_id:
        job_obj = await get_job_by_id(db, project_id, crawl_job_id)
        if job_obj:
            await _mark_job_completed(job_obj)
    await db.flush()
    return metrics


# ---------------------------------------------------------------------------
# Article processing
# ---------------------------------------------------------------------------

async def _process_article(
    db: AsyncSession,
    project: Project,
    article: dict,
    search_terms: list[str] | None = None,
    pending_post: list[Mention] | None = None,
    precomputed_nlp: tuple[str, float, dict] | None = None,
) -> tuple[bool, bool]:
    """Process a single article: dedup, NLP analysis, save as mention.

    ``search_terms`` is a lowercase list of the project's main topic + aliases.
    It's used to compute ``keyword_score`` (how many of the project's terms are
    actually present in title+body) and to filter out completely off-topic
    results returned by an aggressive ``OR`` query.
    """
    url = str(article.get("url") or "").strip()
    if not url:
        return False, False

    title = str(article.get("title") or "").strip()
    if title == "[Removed]":
        return False, False

    description = str(article.get("description") or "").strip()
    content = str(article.get("content") or "").strip()
    body = content or description
    author = str(article.get("author") or "").strip()
    image_url = str(article.get("urlToImage") or "").strip()
    source_name = ""
    source_obj = article.get("source")
    if isinstance(source_obj, dict):
        source_name = str(source_obj.get("name") or "").strip()

    published_str = str(article.get("publishedAt") or "").strip()
    if not published_str:
        logger.warning("Article has no publishedAt date: %s — skipping", url[:100])
        return False, False
    published_at = _parse_date(published_str)
    if published_at is None:
        logger.warning("Could not parse date for article: %s (raw=%r) — skipping", url[:100], published_str)
        return False, False

    article_country = nlp_service.normalize_country(article.get("_country"))
    if article_country == "XX":
        article_country = ""

    canonical_url = nlp_service.canonicalize_url(url)
    normalized_text = nlp_service.normalize_text(f"{title} {body}")
    url_hash = hashlib.sha256(canonical_url.encode()).hexdigest()
    title_hash = hashlib.sha256(title.lower().encode()).hexdigest() if title else None
    text_hash = hashlib.sha256(normalized_text.encode()).hexdigest() if normalized_text else None

    # Use first() (with limit 1) instead of scalar_one_or_none(): if historic
    # duplicate rows exist for the same (project_id, url_hash) — which can
    # happen after re-runs before unique indexes were added — we still treat
    # the article as a duplicate instead of crashing the whole ingestion job.
    existing_raw = (
        await db.execute(
            select(RawDocument)
            .where(
                RawDocument.project_id == project.id,
                RawDocument.url_hash == url_hash,
            )
            .limit(1)
        )
    ).scalars().first()
    if existing_raw:
        return True, False

    existing_mention = (
        await db.execute(
            select(Mention)
            .where(
                Mention.project_id == project.id,
                Mention.url == canonical_url,
            )
            .limit(1)
        )
    ).scalars().first()
    if existing_mention:
        return True, False

    cluster = await dedup_service.assign_cluster(
        db=db,
        project_id=project.id,
        normalized_text=normalized_text,
        url_hash=url_hash,
        title_hash=title_hash,
        text_hash=text_hash,
    )

    source = await _get_or_create_source(db, project.id, source_name, url)

    raw = RawDocument(
        project_id=project.id,
        source_id=source.id,
        url=canonical_url,
        final_url=canonical_url,
        title=title,
        raw_text=body,
        normalized_text=normalized_text,
        url_hash=url_hash,
        title_hash=title_hash,
        text_hash=text_hash,
        simhash=cluster.simhash,
        cluster_id=cluster.cluster_id,
        cluster_size=cluster.cluster_size,
        primary_doc=cluster.primary_doc,
        published_at=published_at,
        language=None,
        country=None,
        metadata_json={"author": author, "image": image_url, "newsapi_source": source_name},
    )
    db.add(raw)

    full_text = f"{title}\n{body}".strip()
    language = nlp_service.detect_language(full_text, fallback="en")
    # Sentiment+emotions is the per-article bottleneck (a ~1.3s GPT call).
    # When the caller has already computed it concurrently (pre-pass), reuse
    # it instead of making another serial call here.
    if precomputed_nlp is not None:
        sentiment_label, sentiment_score, emotions = precomputed_nlp
    else:
        sentiment_label, sentiment_score, emotions = (
            await nlp_service.score_sentiment_and_emotions_gpt(full_text)
        )
    entities = nlp_service.extract_entities(full_text)

    proj_settings = dict(project.settings or {})
    keywords = list(proj_settings.get("keywords") or [])
    tags = nlp_service.topic_tags(full_text, keywords)

    # Relevance gate — balance coverage with precision. The haystack is
    # title+body+url lowercased. An article is accepted if ANY project term
    # matches by:
    #   - exact phrase match of a multi-word term ("astana it university",
    #     "астана ит университет"), OR
    #   - a specific single-token term/acronym present (>= 3 chars, e.g.
    #     "aitu").
    # We deliberately do NOT accept a loose "all tokens present somewhere"
    # match: "it"/"university" appear in unrelated articles (e.g. "University
    # of Arizona") and would pollute the project with off-topic noise.
    keyword_score = 1.0
    # Official-site articles come straight from the entity's own website
    # (e.g. astanait.edu.kz) — they're guaranteed about the topic, so skip
    # the keyword relevance gate entirely.
    if article.get("_is_official"):
        keyword_score = 1.0
    elif search_terms:
        haystack = f"{title}\n{body}\n{canonical_url}".lower()
        hits = 0
        for term in search_terms:
            t = (term or "").strip().lower()
            if not t:
                continue
            tokens = [tok for tok in t.split() if tok]
            if len(tokens) >= 2:
                # Multi-word term: require the full phrase as a substring.
                if t in haystack:
                    hits += 1
            elif len(t) < 3:
                continue
            elif len(t) >= 5:
                # Longer single token (typically a name/word): match at a word
                # boundary allowing trailing letters, so inflected Russian /
                # Kazakh forms still match ("Токаев" -> "Токаева", "Токаевым",
                # "Тоқаевтың"...). This is essential for recall on names.
                if re.search(r"\b" + re.escape(t), haystack):
                    hits += 1
            else:
                # Short single token (3-4 chars, typically an acronym like
                # "aitu"): require an exact whole word so we don't pull
                # substring noise ("aitutaki", Samoan "aitu").
                if re.search(r"\b" + re.escape(t) + r"\b", haystack):
                    hits += 1
        if hits == 0:
            return False, False
        keyword_score = round(min(1.0, hits / max(1, min(len(search_terms), 4))), 4)

    api_reach = article.get("_reach")
    if api_reach and int(api_reach) > 0:
        # Real engagement shipped by the provider API (e.g. Event Registry
        # social shares / score) — use it verbatim.
        actual_reach = int(api_reach)
    else:
        actual_reach = _estimate_article_reach(canonical_url, source_name, published_at)
    influence = _compute_influence(
        source_trust=source.trust_score,
        reach=actual_reach,
        published_at=published_at,
        keyword_score=keyword_score,
    )

    country = nlp_service.normalize_country(
        _guess_country_from_domain(canonical_url) or article_country or _guess_country(language)
    )

    mention = Mention(
        project_id=project.id,
        source_id=source.id,
        url=canonical_url,
        title=title or source_name,
        body=body or title or "",
        snippet=(description or body or title or "")[:500],
        published_at=published_at,
        language=language,
        country=country,
        sentiment_score=float(sentiment_score),
        sentiment_label=sentiment_label,
        reach=actual_reach,
        influence_score=influence,
        summary=(description or body or "")[:1000],
        emotions=emotions,
        entities=entities,
        tags=tags,
        cluster_id=cluster.cluster_id,
        cluster_size=cluster.cluster_size,
        primary_doc=cluster.primary_doc,
        keyword_score=keyword_score,
        semantic_score=1.0,
        final_relevance_score=keyword_score,
    )
    db.add(mention)
    await db.flush()  # need mention.id for embedding + topic assignment

    if pending_post is not None:
        # Defer embedding + topic assignment to the batch flush — one OpenAI
        # request will cover this whole chunk instead of one per article.
        pending_post.append(mention)
    else:
        # Legacy per-article path (kept for callers that don't batch).
        try:
            from app.services import embedding_service
            await embedding_service.embed_and_store_mention(db, mention)
        except Exception as exc:
            logger.warning("embed_and_store_mention failed for %s: %s", mention.id, exc)

        try:
            from app.services import topic_service
            topic_id = await topic_service.assign_to_best_topic(db, mention)
            if topic_id:
                mention.topic_id = topic_id
        except Exception as exc:
            logger.warning("topic auto-assignment failed for %s: %s", mention.id, exc)

    return False, True


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_SOURCE_CACHE: dict[str, Source] = {}


async def _get_or_create_source(db: AsyncSession, project_id: str, source_name: str, article_url: str) -> Source:
    cache_key = f"{project_id}:{source_name}"
    if cache_key in _SOURCE_CACHE:
        return _SOURCE_CACHE[cache_key]

    existing = (
        await db.execute(
            select(Source)
            .where(Source.project_id == project_id, Source.name == source_name)
            .limit(1)
        )
    ).scalars().first()
    if existing:
        _SOURCE_CACHE[cache_key] = existing
        return existing

    domain = ""
    try:
        parsed = urlparse(article_url)
        domain = parsed.netloc or ""
    except Exception:
        pass

    raw_country = _guess_country_from_domain(article_url)
    source_country = nlp_service.normalize_country(raw_country) if raw_country else None
    if source_country == "XX":
        source_country = None

    trust = _compute_source_trust(domain, source_name, article_url)

    source = Source(
        project_id=project_id,
        name=source_name or domain or "Unknown",
        type="news",
        base_url=f"https://{domain}" if domain else article_url,
        active=True,
        trust_score=trust,
        country=source_country,
        language=None,
    )
    db.add(source)
    await db.flush()
    _SOURCE_CACHE[cache_key] = source
    return source


def _parse_date(raw: str) -> datetime | None:
    """Parse dates from many common API formats. Return None if unparseable.

    Returning None lets the caller skip articles with bad dates instead of
    silently mislabelling them as "just now".
    """
    import re
    now = _utcnow()
    if not raw:
        return None

    cleaned = raw.strip()

    # ISO 8601: "2025-03-15T10:30:00Z" / "2025-03-15T10:30:00+00:00"
    try:
        parsed = datetime.fromisoformat(cleaned.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed
    except Exception:
        pass

    # NewsData.io: "2025-03-15 10:30:00"
    try:
        parsed = datetime.strptime(cleaned[:19], "%Y-%m-%d %H:%M:%S")
        return parsed.replace(tzinfo=timezone.utc)
    except Exception:
        pass

    # RFC 2822 / HTTP: "Sat, 15 Mar 2025 10:30:00 GMT"
    try:
        from email.utils import parsedate_to_datetime
        parsed = parsedate_to_datetime(cleaned)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed
    except Exception:
        pass

    # SerpAPI / common: "Mar 15, 2025, 10:30 AM" or "March 15, 2025"
    for fmt in (
        "%b %d, %Y, %I:%M %p",
        "%b %d, %Y",
        "%B %d, %Y, %I:%M %p",
        "%B %d, %Y",
        "%d %b %Y",
        "%d %B %Y",
        "%Y/%m/%d",
    ):
        try:
            parsed = datetime.strptime(cleaned, fmt)
            return parsed.replace(tzinfo=timezone.utc)
        except Exception:
            continue

    # Relative: "2 hours ago", "10 минут назад"
    lower = cleaned.lower()
    m = re.match(
        r"(\d+)\s+(second|minute|hour|day|week|month|секунд|минут|час|дн|недел|месяц)\w*\s+(ago|назад)",
        lower,
    )
    if m:
        amount = int(m.group(1))
        unit = m.group(2)
        delta_map = {
            "second": timedelta(seconds=amount),
            "секунд": timedelta(seconds=amount),
            "minute": timedelta(minutes=amount),
            "минут": timedelta(minutes=amount),
            "hour": timedelta(hours=amount),
            "час": timedelta(hours=amount),
            "day": timedelta(days=amount),
            "дн": timedelta(days=amount),
            "week": timedelta(weeks=amount),
            "недел": timedelta(weeks=amount),
            "month": timedelta(days=amount * 30),
            "месяц": timedelta(days=amount * 30),
        }
        return now - delta_map.get(unit, timedelta())

    # Fallback: any "<n> <unit> ago"
    m2 = re.search(r"(\d+)\s+(\w+)\s+ago", lower)
    if m2:
        amount = int(m2.group(1))
        unit_word = m2.group(2).rstrip("s")
        delta_map2 = {
            "second": timedelta(seconds=amount),
            "minute": timedelta(minutes=amount),
            "hour": timedelta(hours=amount),
            "day": timedelta(days=amount),
            "week": timedelta(weeks=amount),
            "month": timedelta(days=amount * 30),
            "year": timedelta(days=amount * 365),
        }
        if unit_word in delta_map2:
            return now - delta_map2[unit_word]

    logger.warning("Could not parse date: %r", raw)
    return None


# ---------------------------------------------------------------------------
# Country / reach heuristics — used when API doesn't ship reach or country.
# Numbers are intentionally rough but stable so the UI is not jumpy.
# ---------------------------------------------------------------------------

_DOMAIN_COUNTRY_MAP: dict[str, str] = {
    "bbc.co.uk": "GB", "bbc.com": "GB", "theguardian.com": "GB", "telegraph.co.uk": "GB",
    "reuters.com": "GB", "ft.com": "GB", "independent.co.uk": "GB", "mirror.co.uk": "GB",
    "cnn.com": "US", "nytimes.com": "US", "washingtonpost.com": "US", "usatoday.com": "US",
    "foxnews.com": "US", "nbcnews.com": "US", "abcnews.go.com": "US", "cbsnews.com": "US",
    "apnews.com": "US", "bloomberg.com": "US", "cnbc.com": "US", "forbes.com": "US",
    "wsj.com": "US", "politico.com": "US", "huffpost.com": "US", "techcrunch.com": "US",
    "ria.ru": "RU", "tass.ru": "RU", "rbc.ru": "RU", "lenta.ru": "RU", "gazeta.ru": "RU",
    "kommersant.ru": "RU", "iz.ru": "RU", "rt.com": "RU", "interfax.ru": "RU",
    "meduza.io": "RU", "novayagazeta.ru": "RU", "vedomosti.ru": "RU",
    "tengrinews.kz": "KZ", "nur.kz": "KZ", "zakon.kz": "KZ", "inform.kz": "KZ",
    "kapital.kz": "KZ", "vlast.kz": "KZ", "kursiv.kz": "KZ", "aqparat.info": "KZ",
    "24.kz": "KZ", "kazinform.kz": "KZ", "forbes.kz": "KZ",
    "inbusiness.kz": "KZ", "stan.kz": "KZ", "gov.kz": "KZ", "strategy2050.kz": "KZ",
    "liter.kz": "KZ", "total.kz": "KZ", "newtimes.kz": "KZ", "time.kz": "KZ",
    "baq.kz": "KZ", "otyrar.kz": "KZ", "azattyq.org": "KZ", "abai.kz": "KZ",
    "el.kz": "KZ", "egemen.kz": "KZ", "qazaqstan3.kz": "KZ",
    "dw.com": "DE", "spiegel.de": "DE", "sueddeutsche.de": "DE",
    "lemonde.fr": "FR", "lefigaro.fr": "FR",
    "elpais.com": "ES", "elmundo.es": "ES",
    "aljazeera.com": "QA", "scmp.com": "HK", "straitstimes.com": "SG",
    "abc.net.au": "AU", "smh.com.au": "AU",
    "globalnews.ca": "CA", "cbc.ca": "CA",
    "ndtv.com": "IN", "hindustantimes.com": "IN", "timesofindia.indiatimes.com": "IN",
    "nhk.or.jp": "JP", "japantimes.co.jp": "JP",
}

_DOMAIN_MONTHLY_VISITORS: dict[str, int] = {
    "cnn.com": 85_000_000, "bbc.com": 75_000_000, "bbc.co.uk": 75_000_000,
    "nytimes.com": 60_000_000, "reuters.com": 50_000_000, "washingtonpost.com": 40_000_000,
    "theguardian.com": 35_000_000, "foxnews.com": 45_000_000, "bloomberg.com": 30_000_000,
    "cnbc.com": 25_000_000, "forbes.com": 30_000_000, "apnews.com": 20_000_000,
    "nbcnews.com": 35_000_000, "abcnews.go.com": 25_000_000, "cbsnews.com": 20_000_000,
    "wsj.com": 20_000_000, "usatoday.com": 25_000_000, "techcrunch.com": 15_000_000,
    "huffpost.com": 20_000_000, "politico.com": 12_000_000, "ft.com": 10_000_000,
    "rt.com": 15_000_000, "aljazeera.com": 20_000_000,
    "ria.ru": 10_000_000, "tass.ru": 8_000_000, "rbc.ru": 12_000_000,
    "lenta.ru": 9_000_000, "gazeta.ru": 7_000_000, "kommersant.ru": 5_000_000,
    "iz.ru": 6_000_000, "interfax.ru": 4_000_000, "vedomosti.ru": 3_000_000,
    "meduza.io": 5_000_000, "novayagazeta.ru": 2_000_000,
    "tengrinews.kz": 3_000_000, "nur.kz": 2_500_000, "zakon.kz": 1_500_000,
    "inform.kz": 1_000_000, "kapital.kz": 800_000, "vlast.kz": 500_000,
    "kursiv.kz": 400_000, "24.kz": 1_200_000, "kazinform.kz": 900_000,
    "inbusiness.kz": 600_000, "stan.kz": 300_000, "gov.kz": 2_000_000,
    "liter.kz": 500_000, "total.kz": 350_000, "newtimes.kz": 200_000,
    "forbes.kz": 700_000,
    "dw.com": 8_000_000, "spiegel.de": 6_000_000,
    "scmp.com": 5_000_000, "ndtv.com": 15_000_000,
}

# Per‑article reach ≈ monthly visitors / 30 days / avg articles/day.
# Big outlets ~300/day, mid ~100/day, small ~30/day.
_DOMAIN_REACH_MAP: dict[str, int] = {}
for _dom, _monthly in _DOMAIN_MONTHLY_VISITORS.items():
    _daily_articles = 300 if _monthly >= 10_000_000 else 100 if _monthly >= 1_000_000 else 30
    _DOMAIN_REACH_MAP[_dom] = max(500, _monthly // (30 * _daily_articles))

_TLD_COUNTRY_MAP: dict[str, str] = {
    "ru": "RU", "kz": "KZ", "uk": "GB", "de": "DE", "fr": "FR", "es": "ES",
    "it": "IT", "jp": "JP", "cn": "CN", "in": "IN", "au": "AU", "ca": "CA",
    "br": "BR", "ua": "UA", "by": "BY", "uz": "UZ", "kg": "KG", "tj": "TJ",
    "tr": "TR", "pl": "PL", "cz": "CZ", "nl": "NL", "se": "SE", "fi": "FI",
}


def _extract_domain(url: str) -> str:
    try:
        parsed = urlparse(url)
        host = (parsed.netloc or "").lower()
        if host.startswith("www."):
            host = host[4:]
        return host
    except Exception:
        return ""


def _guess_country_from_domain(url: str) -> str:
    domain = _extract_domain(url)
    if not domain:
        return ""
    if domain in _DOMAIN_COUNTRY_MAP:
        return _DOMAIN_COUNTRY_MAP[domain]
    for known_domain, country in _DOMAIN_COUNTRY_MAP.items():
        if domain.endswith("." + known_domain):
            return country
    tld = domain.rsplit(".", 1)[-1] if "." in domain else ""
    return _TLD_COUNTRY_MAP.get(tld, "")


def _estimate_domain_reach(url: str, source_name: str) -> int:
    """Estimate per‑article reach when the API doesn't ship one."""
    del source_name
    domain = _extract_domain(url)
    if domain in _DOMAIN_REACH_MAP:
        return _DOMAIN_REACH_MAP[domain]
    for known_domain, reach in _DOMAIN_REACH_MAP.items():
        if domain.endswith("." + known_domain):
            return reach
    tld = domain.rsplit(".", 1)[-1] if "." in domain else ""
    tld_defaults = {
        "com": 2_000, "org": 1_500, "net": 1_000,
        "ru": 1_500, "kz": 800, "uk": 2_000,
        "de": 1_500, "fr": 1_500,
    }
    return tld_defaults.get(tld, 500)


def _compute_source_trust(domain: str, source_name: str, article_url: str) -> float:
    """Source authority in [0, 1] — shown as ``influence`` (×100) in the UI.

    Derived on a CONTINUOUS log scale from the hardcoded monthly-visitor
    figures, so each outlet gets a realistic, varied score instead of the old
    flat 0.5 (=50.00) default. Domains are normalised (``www.`` stripped,
    sub-domains matched) so e.g. ``en.tengrinews.kz`` resolves to its parent.
    Unknown domains fall back to a reach-based estimate plus a small STABLE
    per-domain offset so two unknown sources never read identical numbers.
    """
    norm = (domain or "").lower()
    if norm.startswith("www."):
        norm = norm[4:]

    monthly = _DOMAIN_MONTHLY_VISITORS.get(norm, 0)
    if not monthly:
        for known_domain, visitors in _DOMAIN_MONTHLY_VISITORS.items():
            if norm.endswith("." + known_domain):
                monthly = visitors
                break

    if monthly > 0:
        # ~200k -> 0.55, 1M -> 0.66, 10M -> 0.81, 85M -> ~0.95
        trust = 0.55 + (math.log10(monthly) - 5.3) * 0.152
    else:
        # Unknown outlet: base on the (already varied) reach estimate, then
        # add a deterministic 0..0.10 offset keyed off the domain so the
        # numbers differ between sources without being truly random per-run.
        reach = _estimate_domain_reach(article_url, source_name)
        base = 0.35 + (math.log10(max(reach, 100)) - 2.7) * 0.10
        seed = int(hashlib.md5((norm or source_name or "x").encode("utf-8")).hexdigest(), 16)
        jitter = (seed % 1000) / 10000.0  # 0.0000 – 0.0999
        trust = base + jitter

    return round(max(0.2, min(0.98, trust)), 4)


def _as_utc(dt: datetime) -> datetime:
    """Return a timezone-aware UTC datetime (naive values are assumed UTC)."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _estimate_article_reach(url: str, source_name: str, published_at: datetime | None) -> int:
    """Estimate per-article reach, varied realistically per article.

    Used only when the provider API does not ship a real engagement figure.
    Starts from the outlet's typical per-article reach (derived from real
    monthly-visitor data) and modulates it so the numbers look organic rather
    than a flat constant repeated for every article of the same source:

      * a STABLE per-URL multiplier (~0.6–1.7) — deterministic, so the value
        never jumps between refreshes, and
      * a recency boost — fresh articles still attract live traffic.
    """
    base = _estimate_domain_reach(url, source_name)
    seed = int(hashlib.md5((url or source_name or "x").encode("utf-8")).hexdigest(), 16)
    factor = 0.6 + (seed % 1100) / 1000.0  # 0.600 – 1.699
    recency = 1.0
    if published_at is not None:
        try:
            age_days = max(0.0, (datetime.now(timezone.utc) - _as_utc(published_at)).total_seconds() / 86400.0)
            recency = 1.0 + 0.4 * math.exp(-age_days / 7.0)  # +40% when fresh, ->1.0 when old
        except Exception:
            recency = 1.0
    return max(50, int(round(base * factor * recency)))


def _compute_influence(
    *,
    source_trust: float,
    reach: int,
    published_at: datetime | None,
    keyword_score: float,
) -> float:
    """Per-article influence score in [1, 100].

    Objective composite — NOT a flat per-source constant — so each mention
    gets a distinct, defensible number instead of every row reading ~50:

      * source authority (outlet credibility / size)  weight 0.40
      * audience size of THIS article (log-scaled reach) weight 0.35
      * recency (fresh news travels further)            weight 0.15
      * topical relevance to the project                weight 0.10

    Because reach and recency differ between articles, the score naturally
    varies across the feed while staying deterministic and explainable.
    """
    authority = max(0.0, min(1.0, source_trust))
    # Reach 100 -> 0.0, 100k -> ~1.0 on a log scale.
    reach_factor = max(0.0, min(1.0, (math.log10(max(reach, 10)) - 2.0) / 3.0))
    recency_factor = 0.5
    if published_at is not None:
        try:
            age_days = max(0.0, (datetime.now(timezone.utc) - _as_utc(published_at)).total_seconds() / 86400.0)
            recency_factor = math.exp(-age_days / 14.0)  # ~1.0 today -> ~0.14 at one month
        except Exception:
            recency_factor = 0.5
    relevance = max(0.0, min(1.0, keyword_score))

    score = (
        0.40 * authority
        + 0.35 * reach_factor
        + 0.15 * recency_factor
        + 0.10 * relevance
    )
    return round(max(1.0, min(100.0, score * 100.0)), 1)


def _guess_country(language: str) -> str:
    return {"ru": "RU", "kk": "KZ", "kz": "KZ", "de": "DE", "fr": "FR", "es": "ES"}.get(language, "US")


async def _mark_job_running(db: AsyncSession, crawl_job_id: str) -> CrawlJob:
    """Mark the job ``running`` in a short-lived OWN session.

    Critical for cross-process progress visibility: if we just did
    ``job.status = "running"; await db.flush()`` inside the long-running
    outer ingestion session, the row-lock on this ``crawl_jobs`` row
    would be held for the duration of the entire ingestion (minutes).
    Every other writer — frontend status reads, job_progress_service
    UPDATEs, scheduler checks — would block until ingestion finishes.

    By opening a separate ``AsyncSessionLocal`` and committing right
    away, the lock is released immediately and the new status is visible
    to other processes instantly. We then re-fetch the row in the OUTER
    session so the caller can read its attributes (without mutating).
    """
    from app.database import AsyncSessionLocal as _Session
    async with _Session() as own_db:
        job = (
            await own_db.execute(select(CrawlJob).where(CrawlJob.id == crawl_job_id))
        ).scalar_one_or_none()
        if not job:
            raise ValueError(f"Crawl job not found: {crawl_job_id}")
        job.status = "running"
        job.started_at = _utcnow()
        job.error = None
        await own_db.commit()

    job = (
        await db.execute(select(CrawlJob).where(CrawlJob.id == crawl_job_id))
    ).scalar_one_or_none()
    return job


async def _finalize_job(
    job_id: str,
    *,
    started_at: datetime | None,
    failed: bool,
    items_fetched: int,
    items_saved: int,
    items_deduplicated: int,
    error: str | None = None,
) -> None:
    """Persist final job counters + status in a SHORT short-lived session.

    The outer ``run_project_ingestion`` transaction MUST NOT mutate or
    flush the ``crawl_jobs`` row, otherwise it would hold a row-lock for
    the entire ingestion (minutes) and this UPDATE — issued from a
    different connection — would block until the outer txn commits.

    By passing primitives instead of an ORM ``CrawlJob`` instance we
    guarantee no SQLAlchemy identity-map collision with the outer
    session and no stray ``UPDATE crawl_jobs`` from a future flush.
    """
    from sqlalchemy import update as _update
    from app.database import AsyncSessionLocal as _Session
    now = _utcnow()
    duration_ms = max(0, int((now - started_at).total_seconds() * 1000)) if started_at else 0
    try:
        async with _Session() as own_db:
            await own_db.execute(
                _update(CrawlJob)
                .where(CrawlJob.id == job_id)
                .values(
                    status="failed" if failed else "completed",
                    items_fetched=int(items_fetched or 0),
                    items_saved=int(items_saved or 0),
                    items_deduplicated=int(items_deduplicated or 0),
                    finished_at=now,
                    duration_ms=duration_ms,
                    error=(error or "")[:2000] or None if failed else None,
                )
            )
            await own_db.commit()
    except Exception as exc:
        logger.warning("finalize_job(%s) failed: %s", job_id, exc)
