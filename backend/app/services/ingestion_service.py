from __future__ import annotations

import hashlib
import logging
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
NEWS_API_LANGUAGES = ["en", "ru"]
LOOKBACK_DAYS = 25

SERP_API_BASE = "https://serpapi.com/search.json"
SERP_LANGUAGES = [
    {"hl": "en", "gl": "us"},
    {"hl": "ru", "gl": "ru"},
]

NEWSDATA_API_BASE = "https://newsdata.io/api/1/latest"
NEWSDATA_LANGUAGES = ["en", "ru"]

EVENT_REGISTRY_API_BASE = "https://eventregistry.org/api/v1/article/getArticles"
EVENT_REGISTRY_LANGUAGES = ["eng", "rus"]

WORLD_NEWS_API_BASE = "https://api.worldnewsapi.com/search-news"
# Per-variant requests: world EN/RU/KZ + Kazakhstan-specific source country.
WORLD_NEWS_VARIANTS: list[dict[str, str]] = [
    {"language": "en"},
    {"language": "ru"},
    {"language": "kk"},
    {"source-country": "kz"},
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


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
    language: str,
    page: int = 1,
    page_size: int | None = None,
    from_date: str | None = None,
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
        "language": language,
        "from": from_date,
        "sortBy": "publishedAt",
        "pageSize": min(effective_page_size, 100),
        "page": page,
        "apiKey": api_key,
    }

    try:
        resp = await client.get(NEWS_API_BASE, params=params)
        if resp.status_code != 200:
            logger.error("NewsAPI %s responded %d: %s", language, resp.status_code, resp.text[:500])
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
    gl: str = "us",
) -> list[dict]:
    api_key = settings.SERP_API_KEY
    if not api_key:
        logger.warning("SERP_API_KEY is not set – skipping SerpAPI fetch")
        return []

    params = {
        "engine": "google",
        "q": query,
        "tbm": "nws",
        "hl": hl,
        "gl": gl,
        "num": 100,
        "api_key": api_key,
    }

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
    language: str = "eng",
    count: int = 100,
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
        "lang": language,
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

    try:
        resp = await client.post(EVENT_REGISTRY_API_BASE, json=payload, timeout=60)
        if resp.status_code != 200:
            logger.error(
                "EventRegistry %s responded %d: %s",
                language, resp.status_code, resp.text[:500],
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
        # Search query that asks each provider for either the main topic
        # or any of the aliases. Falls back to plain topic when no aliases.
        search_query = _build_or_query(topic_query, aliases_list) or topic_query
        all_terms_lower = [t.lower() for t in _normalize_terms([topic_query] + aliases_list)]
        logger.info(
            "Project %s search query: %r (aliases=%d)",
            project_id, search_query, len(aliases_list),
        )

        total_steps = (
            len(NEWS_API_LANGUAGES)
            + len(SERP_LANGUAGES)
            + len(NEWSDATA_LANGUAGES)
            + len(EVENT_REGISTRY_LANGUAGES)
            + len(WORLD_NEWS_VARIANTS)
        )
        job_progress_service.start_job(job.id, total_sources=total_steps)

        fetched_total = 0
        saved_total = 0
        dedup_total = 0

        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            for lang in NEWS_API_LANGUAGES:
                articles = await _fetch_newsapi(client, query=search_query, language=lang)
                fetched_total += len(articles)
                for article in articles:
                    is_dup, created = await _process_article(db=db, project=project, article=article, search_terms=all_terms_lower)
                    if is_dup:
                        dedup_total += 1
                    if created:
                        saved_total += 1
                job_progress_service.advance_job(job.id, delta=1)
                await db.flush()

            for serp_lang in SERP_LANGUAGES:
                articles = await _fetch_serpapi(client, query=search_query, hl=serp_lang["hl"], gl=serp_lang["gl"])
                fetched_total += len(articles)
                for article in articles:
                    is_dup, created = await _process_article(db=db, project=project, article=article, search_terms=all_terms_lower)
                    if is_dup:
                        dedup_total += 1
                    if created:
                        saved_total += 1
                job_progress_service.advance_job(job.id, delta=1)
                await db.flush()

            for nd_lang in NEWSDATA_LANGUAGES:
                articles = await _fetch_newsdata(client, query=search_query, language=nd_lang)
                fetched_total += len(articles)
                for article in articles:
                    is_dup, created = await _process_article(db=db, project=project, article=article, search_terms=all_terms_lower)
                    if is_dup:
                        dedup_total += 1
                    if created:
                        saved_total += 1
                job_progress_service.advance_job(job.id, delta=1)
                await db.flush()

            for er_lang in EVENT_REGISTRY_LANGUAGES:
                articles = await _fetch_event_registry(client, query=search_query, language=er_lang)
                fetched_total += len(articles)
                for article in articles:
                    is_dup, created = await _process_article(db=db, project=project, article=article, search_terms=all_terms_lower)
                    if is_dup:
                        dedup_total += 1
                    if created:
                        saved_total += 1
                job_progress_service.advance_job(job.id, delta=1)
                await db.flush()

            for wn_variant in WORLD_NEWS_VARIANTS:
                articles = await _fetch_world_news(client, query=search_query, variant=wn_variant)
                fetched_total += len(articles)
                for article in articles:
                    is_dup, created = await _process_article(db=db, project=project, article=article, search_terms=all_terms_lower)
                    if is_dup:
                        dedup_total += 1
                    if created:
                        saved_total += 1
                job_progress_service.advance_job(job.id, delta=1)
                await db.flush()

        job.items_fetched = fetched_total
        job.items_saved = saved_total
        job.items_deduplicated = dedup_total
        await recompute_project_metrics(db=db, project_id=project_id)
        await _mark_job_completed(job)
        job_progress_service.finish_job(job.id, failed=False)
        await db.flush()
        return job
    except Exception as exc:
        job.error = str(exc)[:2000]
        await _mark_job_failed(job)
        job_progress_service.finish_job(job.id, failed=True, error=str(exc))
        await db.flush()
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

    existing_raw = (
        await db.execute(
            select(RawDocument).where(
                RawDocument.project_id == project.id,
                RawDocument.url_hash == url_hash,
            ),
        )
    ).scalar_one_or_none()
    if existing_raw:
        return True, False

    existing_mention = (
        await db.execute(
            select(Mention).where(
                Mention.project_id == project.id,
                Mention.url == canonical_url,
            ),
        )
    ).scalar_one_or_none()
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
    sentiment_label, sentiment_score = nlp_service.score_sentiment_gpt(full_text)
    emotions = nlp_service.emotion_scores(full_text)
    entities = nlp_service.extract_entities(full_text)

    proj_settings = dict(project.settings or {})
    keywords = list(proj_settings.get("keywords") or [])
    tags = nlp_service.topic_tags(full_text, keywords)

    # Multi-keyword relevance: how many of the project's terms appear in the
    # combined title+body? If the project has aliases and ZERO of them match,
    # drop the article — it came from an OR-query collateral, not actually
    # about our topic.
    keyword_score = 1.0
    if search_terms:
        haystack = f"{title}\n{body}".lower()
        hits = sum(1 for term in search_terms if term and term in haystack)
        if hits == 0:
            return False, False
        keyword_score = round(min(1.0, hits / max(1, min(len(search_terms), 4))), 4)

    api_reach = article.get("_reach")
    if api_reach and int(api_reach) > 0:
        actual_reach = int(api_reach)
    else:
        actual_reach = _estimate_domain_reach(canonical_url, source_name)
    influence = round(min(100.0, source.trust_score * 100), 2)

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
            select(Source).where(Source.project_id == project_id, Source.name == source_name).limit(1),
        )
    ).scalar_one_or_none()
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

    monthly = _DOMAIN_MONTHLY_VISITORS.get(domain, 0)
    if monthly >= 50_000_000:
        trust = 0.95
    elif monthly >= 10_000_000:
        trust = 0.85
    elif monthly >= 1_000_000:
        trust = 0.75
    elif monthly >= 100_000:
        trust = 0.6
    else:
        trust = 0.5

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


def _guess_country(language: str) -> str:
    return {"ru": "RU", "kk": "KZ", "kz": "KZ", "de": "DE", "fr": "FR", "es": "ES"}.get(language, "US")


async def _mark_job_running(db: AsyncSession, crawl_job_id: str) -> CrawlJob:
    job = (
        await db.execute(select(CrawlJob).where(CrawlJob.id == crawl_job_id))
    ).scalar_one_or_none()
    if not job:
        raise ValueError(f"Crawl job not found: {crawl_job_id}")
    job.status = "running"
    job.started_at = _utcnow()
    job.error = None
    await db.flush()
    return job


async def _mark_job_completed(job: CrawlJob) -> None:
    now = _utcnow()
    job.status = "completed"
    job.finished_at = now
    if job.started_at:
        job.duration_ms = max(0, int((now - job.started_at).total_seconds() * 1000))


async def _mark_job_failed(job: CrawlJob) -> None:
    now = _utcnow()
    job.status = "failed"
    job.finished_at = now
    if job.started_at:
        job.duration_ms = max(0, int((now - job.started_at).total_seconds() * 1000))
