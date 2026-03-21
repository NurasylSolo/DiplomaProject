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


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


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
            articles.append({
                "url": link,
                "title": title,
                "description": description,
                "content": description,
                "author": str(author),
                "urlToImage": image_url,
                "publishedAt": pub_date,
                "source": {"name": source_name},
            })
        return articles
    except Exception as exc:
        logger.error("NewsData.io request failed: %s", exc)
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

        total_steps = len(NEWS_API_LANGUAGES) + len(SERP_LANGUAGES) + len(NEWSDATA_LANGUAGES)
        job_progress_service.start_job(job.id, total_sources=total_steps)

        fetched_total = 0
        saved_total = 0
        dedup_total = 0

        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            for lang in NEWS_API_LANGUAGES:
                articles = await _fetch_newsapi(client, query=topic_query, language=lang)
                fetched_total += len(articles)
                for article in articles:
                    is_dup, created = await _process_article(db=db, project=project, article=article)
                    if is_dup:
                        dedup_total += 1
                    if created:
                        saved_total += 1
                job_progress_service.advance_job(job.id, delta=1)
                await db.flush()

            for serp_lang in SERP_LANGUAGES:
                articles = await _fetch_serpapi(client, query=topic_query, hl=serp_lang["hl"], gl=serp_lang["gl"])
                fetched_total += len(articles)
                for article in articles:
                    is_dup, created = await _process_article(db=db, project=project, article=article)
                    if is_dup:
                        dedup_total += 1
                    if created:
                        saved_total += 1
                job_progress_service.advance_job(job.id, delta=1)
                await db.flush()

            for nd_lang in NEWSDATA_LANGUAGES:
                articles = await _fetch_newsdata(client, query=topic_query, language=nd_lang)
                fetched_total += len(articles)
                for article in articles:
                    is_dup, created = await _process_article(db=db, project=project, article=article)
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
) -> tuple[bool, bool]:
    """Process a single NewsAPI article: dedup, NLP analysis, save as mention."""
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
    published_at = _utcnow()
    if published_str:
        published_at = _parse_date(published_str)

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
    sentiment_label, sentiment_score = nlp_service.score_sentiment(full_text)
    emotions = nlp_service.emotion_scores(full_text)
    entities = nlp_service.extract_entities(full_text)

    proj_settings = dict(project.settings or {})
    keywords = list(proj_settings.get("keywords") or [])
    tags = nlp_service.topic_tags(full_text, keywords)

    reach = max(100, int(500 + (source.trust_score * 2000) + (len(full_text) * 0.5)))
    influence = round(min(100.0, source.trust_score * 100), 2)

    mention = Mention(
        project_id=project.id,
        source_id=source.id,
        url=canonical_url,
        title=title or source_name,
        body=body or title or "",
        snippet=(description or body or title or "")[:500],
        published_at=published_at,
        language=language,
        country=_guess_country(language),
        sentiment_score=float(sentiment_score),
        sentiment_label=sentiment_label,
        reach=reach,
        influence_score=influence,
        summary=(description or body or "")[:1000],
        emotions=emotions,
        entities=entities,
        tags=tags,
        cluster_id=cluster.cluster_id,
        cluster_size=cluster.cluster_size,
        primary_doc=cluster.primary_doc,
        keyword_score=1.0,
        semantic_score=1.0,
        final_relevance_score=1.0,
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

    source = Source(
        project_id=project_id,
        name=source_name or domain or "Unknown",
        type="news",
        base_url=f"https://{domain}" if domain else article_url,
        active=True,
        trust_score=0.7,
        country=None,
        language=None,
    )
    db.add(source)
    await db.flush()
    _SOURCE_CACHE[cache_key] = source
    return source


def _parse_date(raw: str) -> datetime:
    """Parse ISO dates and relative dates like '2 hours ago', '1 day ago'."""
    import re
    now = _utcnow()
    if not raw:
        return now
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed
    except Exception:
        pass
    lower = raw.lower().strip()
    m = re.match(r"(\d+)\s+(second|minute|hour|day|week|month)s?\s+ago", lower)
    if m:
        amount = int(m.group(1))
        unit = m.group(2)
        delta_map = {
            "second": timedelta(seconds=amount),
            "minute": timedelta(minutes=amount),
            "hour": timedelta(hours=amount),
            "day": timedelta(days=amount),
            "week": timedelta(weeks=amount),
            "month": timedelta(days=amount * 30),
        }
        return now - delta_map.get(unit, timedelta())
    return now


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
